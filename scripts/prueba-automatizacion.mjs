// Prueba las rutas de cron, baja y reclamos contra un Supabase FALSO local, con
// Gmail desactivado. No toca producción ni envía correos.
// Uso: node scripts/prueba-automatizacion.mjs
import { createServer } from 'node:http'
import { spawn, execSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import assert from 'node:assert/strict'

const V = '11111111-1111-4111-8111-111111111111'
const R = '22222222-2222-4222-8222-222222222222'
const escrituras = []

const datos = {
  tiendas: [{ id: V, nombre: 'Tienda Falsa', created_at: '2026-01-01T00:00:00Z' }],
  productos: [],
  pedidos: [{ estado: 'pagado', created_at: '2026-01-01T00:00:00Z' }],
  mensajes_soporte: [{ vendedor_id: V, autor: 'vendedor', created_at: '2026-11-20T15:00:00Z' }],
  reclamaciones: [{ codigo: 'MERKAO-0000-00000', tipo: 'QUEJA', fecha_reclamo: '2026-11-16T15:00:00Z', respondido_en: null }],
  recordatorios_vendedor: [],
}

const falso = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    const json = (v, headers = {}) => {
      res.writeHead(200, { 'content-type': 'application/json', ...headers })
      res.end(JSON.stringify(v))
    }
    if (url.pathname === '/auth/v1/user') return json({ id: 'admin', email: 'alexisaranap21@gmail.com' })
    if (url.pathname.startsWith('/auth/v1/admin/users/')) return json({ id: V, email: 'vendedor@example.com' })
    const tabla = url.pathname.split('/').pop()
    if (req.method === 'HEAD') return json(null, { 'content-range': '*/0' })
    if (req.method !== 'GET') {
      escrituras.push({ metodo: req.method, tabla, filtros: decodeURIComponent(url.search), body })
      if (tabla === 'recordatorios_vendedor') return json([{ envios: 0 }])
      return json([{ id: R }])
    }
    const unico = (req.headers.accept ?? '').includes('pgrst.object')
    json(unico ? datos[tabla]?.[0] : datos[tabla] ?? [])
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
    GMAIL_USER: '',
    GMAIL_APP_PASSWORD: '',
  },
  stdio: 'ignore',
})

const BASE = 'http://127.0.0.1:3999'
const pedir = (ruta, opciones = {}) => fetch(BASE + ruta, { signal: AbortSignal.timeout(120000), ...opciones })
const cron = { headers: { authorization: 'Bearer secreto-de-prueba' } }
const paso = (t) => console.log('✔ ' + t)

try {
  let lista = false
  for (let i = 0; i < 90 && !lista; i++) {
    lista = await pedir('/api/cron/resumen').then((r) => r.status === 401).catch(() => false)
    if (!lista) await new Promise((r) => setTimeout(r, 1000))
  }
  assert.ok(lista)
  assert.equal((await pedir('/api/cron/recordatorios')).status, 401)
  paso('los dos cron rechazan sin CRON_SECRET')

  const resumen = await (await pedir('/api/cron/resumen?simular=1', cron)).json()
  console.log('--- resumen simulado ---\n' + resumen.subject + '\n\n' + resumen.text + '\n------------------------')
  assert.match(resumen.text, /MERKAO-0000-00000/)
  assert.match(resumen.text, /Soporte sin responder: 1 \(Tienda Falsa, desde el 20\/11\)/)
  const sinGmail = await pedir('/api/cron/resumen', cron)
  assert.deepEqual(await sinGmail.json(), { enviado: false, motivo: 'not_configured' })
  paso('resumen armado; con Gmail apagado no envía y lo reporta como error')

  const sim = await (await pedir('/api/cron/recordatorios?simular=1', cron)).json()
  assert.equal(sim.total, 1)
  assert.equal(sim.correos[0].tipo, 'sin_productos')
  assert.equal(escrituras.length, 0)
  paso('recordatorios simulados: 1 correo y ninguna escritura')

  const real = await (await pedir('/api/cron/recordatorios', cron)).json()
  assert.deepEqual(real, { enviados: 0, fallidos: 1 })
  assert.match(escrituras[1].filtros, /baja_at=is\.null.*ultimo_envio_at\.is\.null/)
  assert.match(escrituras.at(-1).body, /"ultimo_envio_at":null/)
  paso('reserva el turno, y si el envío falla lo libera')

  escrituras.length = 0
  const token = createHmac('sha256', 'service-falsa').update('baja:' + V).digest('hex')
  const baja = '/api/recordatorios/baja?v=' + V + '&t=' + token
  assert.equal((await pedir(baja.slice(0, -1) + (token.endsWith('0') ? '1' : '0'), { method: 'POST' })).status, 400)
  const abrir = await pedir(baja)
  assert.equal(abrir.status, 200)
  assert.match(await abrir.text(), /\.submit\(\)/)
  assert.equal(escrituras.length, 0)
  const confirmar = await pedir(baja, { method: 'POST' })
  assert.match(await confirmar.text(), /Ya no recibirás estos recordatorios/)
  assert.match(escrituras[0].body, /"baja_at"/)
  paso('baja: firma alterada rechazada, abrir no escribe, el envío del formulario registra la baja')

  escrituras.length = 0
  const admin = (body) => pedir('/api/admin/reclamos', {
    method: 'POST',
    headers: { authorization: 'Bearer sesion', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.equal((await pedir('/api/admin/reclamos', { method: 'POST' })).status, 401)
  assert.equal((await admin({ id: R, fecha: '2099-01-01', respuesta: 'x' })).status, 400)
  assert.equal((await admin({ id: R, fecha: '2026-11-01', respuesta: 'x' })).status, 400)
  assert.equal((await admin({ id: R, fecha: '2026-11-20', respuesta: '' })).status, 400)
  assert.equal(escrituras.length, 0)
  const ok = await admin({ id: R, fecha: '2026-11-20', respuesta: 'Se devolvió el dinero.' })
  assert.equal(ok.status, 200)
  assert.match(escrituras[0].body, /"respondido_en":"2026-11-20T17:00:00.000Z"/)
  assert.match(escrituras[0].filtros, /respondido_en=is\.null/)
  paso('reclamos: sin sesión 401, fechas fuera de rango 400, respuesta válida se guarda con su fecha')
  console.log('TODO OK')
} finally {
  if (process.platform === 'win32') execSync('taskkill /pid ' + app.pid + ' /T /F', { stdio: 'ignore' })
  else app.kill()
  falso.close()
}
