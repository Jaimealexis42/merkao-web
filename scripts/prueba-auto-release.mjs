// Prueba la ruta real /api/escrow/auto-release contra un Supabase FALSO local.
// No toca producción. Uso: node scripts/prueba-auto-release.mjs
import { createServer } from 'node:http'
import { spawn, execSync } from 'node:child_process'
import assert from 'node:assert/strict'

const llamadas = []
const falso = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    llamadas.push({ metodo: req.method, tabla: url.pathname.split('/').pop(), filtros: decodeURIComponent(url.search), body })
    res.setHeader('content-type', 'application/json')
    // Un pedido entregado hace más de 7 días.
    res.end(url.pathname.endsWith('/pedidos') ? JSON.stringify([{ id: 'pedido-de-prueba' }]) : '[]')
  })
})
await new Promise((r) => falso.listen(54399, r))

const app = spawn('npx next dev -p 3999', {
  shell: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54399',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-falsa',
    SUPABASE_SERVICE_ROLE_KEY: 'service-falsa',
    CRON_SECRET: 'secreto-de-prueba',
  },
  stdio: 'ignore',
})
const URL_RUTA = 'http://127.0.0.1:3999/api/escrow/auto-release'
const pedir = (opciones = {}) => fetch(URL_RUTA, { signal: AbortSignal.timeout(120000), ...opciones })

try {
  let sinAuth
  for (let i = 0; i < 90 && !sinAuth; i++) {
    sinAuth = await pedir().catch(() => null)
    if (!sinAuth) await new Promise((r) => setTimeout(r, 1000))
  }
  console.log('GET sin Authorization ->', sinAuth.status)
  assert.equal(sinAuth.status, 401)

  const mala = await pedir({ headers: { authorization: 'Bearer otro' } })
  console.log('GET con secreto equivocado ->', mala.status)
  assert.equal(mala.status, 401)
  assert.equal(llamadas.length, 0, 'sin autorización no debe tocar la base')

  const post = await pedir({ method: 'POST' })
  console.log('POST ->', post.status)
  assert.equal(post.status, 405)

  const buena = await pedir({ headers: { authorization: 'Bearer secreto-de-prueba' } })
  const json = await buena.json()
  console.log('GET como Vercel Cron ->', buena.status, JSON.stringify(json))
  assert.equal(buena.status, 200)
  assert.equal(json.liberados, 1)
  for (const l of llamadas) console.log('  base:', l.metodo, l.tabla, l.filtros, l.body)
  const [consulta, pedidos, comisiones] = llamadas
  assert.match(consulta.filtros, /estado=eq\.entregado.*escrow_liberado=eq\.false.*entregado_at=lt\./)
  assert.equal(pedidos.metodo, 'PATCH')
  assert.match(pedidos.body, /"estado":"liberado","escrow_liberado":true/)
  assert.match(pedidos.filtros, /estado=eq\.entregado/)
  assert.equal(comisiones.tabla, 'comisiones_merkao')
  assert.equal(comisiones.metodo, 'PATCH')
  console.log('TODO OK')
} finally {
  if (process.platform === 'win32') execSync('taskkill /pid ' + app.pid + ' /T /F', { stdio: 'ignore' })
  else app.kill()
  falso.close()
}
