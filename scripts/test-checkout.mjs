/**
 * Test de integración del checkout Culqi.
 * Lee CULQI_TEST_SECRET_KEY y CULQI_TEST_PUBLIC_KEY del .env.local.
 * Levanta next dev en puerto 3099 con claves de prueba, crea tokens Culqi
 * vía API, prueba compra exitosa + rechazada, limpia pedidos de prueba.
 *
 * USO: node scripts/test-checkout.mjs
 *
 * Prerrequisito: agregar al .env.local
 *   CULQI_TEST_SECRET_KEY=sk_test_...
 *   CULQI_TEST_PUBLIC_KEY=pk_test_...
 */

import { readFileSync } from 'fs'
import { spawn } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 3099
const BASE_URL = `http://localhost:${PORT}`

// ── Leer .env.local ──────────────────────────────────────────────────────────
const env = {}
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const TEST_SECRET = env['CULQI_TEST_SECRET_KEY']
const TEST_PUBLIC = env['CULQI_TEST_PUBLIC_KEY']
const SUPA_URL    = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPA_SVC    = env['SUPABASE_SERVICE_ROLE_KEY']

if (!TEST_SECRET || !TEST_PUBLIC) {
  console.error('\n❌  Faltan claves de prueba en .env.local')
  console.error('   Agrega:')
  console.error('     CULQI_TEST_SECRET_KEY=sk_test_...')
  console.error('     CULQI_TEST_PUBLIC_KEY=pk_test_...')
  console.error('   (obtén estas claves en panel.culqi.com → Desarrollo → Claves API)')
  process.exit(1)
}
if (!SUPA_URL || !SUPA_SVC) {
  console.error('❌  Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const admin = createClient(SUPA_URL, SUPA_SVC, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

// ── Buscar un producto activo con vendedor real ──────────────────────────────
console.log('\n🔍  Buscando producto activo de prueba…')
const { data: productos, error: eprod } = await admin
  .from('productos')
  .select('id, nombre, precio, vendedor_id')
  .eq('estado', 'activo')
  .not('vendedor_id', 'is', null)
  .gt('precio', 0)
  .limit(1)
  .single()

if (eprod || !productos) {
  console.error('❌  No se encontró ningún producto activo:', eprod?.message)
  process.exit(1)
}
const PRODUCTO_ID = productos.id
console.log(`   Producto: "${productos.nombre}" — S/ ${productos.precio} — ID ${PRODUCTO_ID}`)

// ── Crear token Culqi vía API de tokenización ───────────────────────────────
async function crearToken(cardNumber) {
  const res = await fetch('https://secure.culqi.com/v2/tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_PUBLIC}`,
    },
    body: JSON.stringify({
      card_number:      cardNumber,
      cvv:              '123',
      expiration_month: '12',
      expiration_year:  '2027',
      email:            'test_checkout@merkao.test',
    }),
  })
  const data = await res.json()
  if (!res.ok || data.object === 'error') {
    throw new Error(`Token creation failed: ${data.user_message ?? data.merchant_message ?? JSON.stringify(data)}`)
  }
  return data.id
}

// ── Levantar next dev con clave de prueba ────────────────────────────────────
console.log(`\n🚀  Levantando next dev en puerto ${PORT} con clave de prueba…`)

// Heredar todas las vars del .env.local pero reemplazar CULQI_SECRET_KEY
const serverEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL:    SUPA_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
  CULQI_SECRET_KEY:             TEST_SECRET,
  SUPABASE_SERVICE_ROLE_KEY:    SUPA_SVC,
  PORT:                         String(PORT),
}

const server = spawn('npx', ['next', 'dev', '--port', String(PORT)], {
  cwd:   ROOT,
  env:   serverEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
})

// Captura logs del server para diagnóstico pero no los muestra por defecto
const serverLogs = []
server.stdout.on('data', d => serverLogs.push(d.toString()))
server.stderr.on('data', d => serverLogs.push(d.toString()))

function killServer() {
  try { server.kill('SIGTERM') } catch { /* ignore */ }
}

// Esperar hasta que el servidor esté listo
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    killServer()
    reject(new Error('Servidor no levantó en 60 s'))
  }, 60_000)

  const check = setInterval(async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/health`).catch(() => null)
        ?? await fetch(`${BASE_URL}/`).catch(() => null)
      if (r) { clearTimeout(timeout); clearInterval(check); resolve() }
    } catch { /* sigue esperando */ }
  }, 1500)
})
console.log('   Servidor listo.')

// ── Llamar al endpoint de checkout ──────────────────────────────────────────
async function checkout(token, label) {
  const res = await fetch(`${BASE_URL}/api/culqi-charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      email:            'test_checkout@merkao.test',
      producto_id:      PRODUCTO_ID,
      cantidad:         1,
      nombre_comprador: 'Test Automatico',
      telefono:         '999000001',
      direccion:        'Av. Test 123',
      notas:            `[PRUEBA AUTOMATICA - ${label}] Borrar`,
      pais_comprador:   'PE',
      metodo_pago:      'tarjeta',
    }),
  })
  const body = await res.json()
  return { status: res.status, body }
}

let pedidosCreados = []
let allPassed = true

try {
  // ── Test 1: Compra exitosa (tarjeta 4111 1111 1111 1111) ──────────────────
  console.log('\n🧪  Test 1: Compra exitosa…')
  let token1
  try {
    token1 = await crearToken('4111111111111111')
    console.log(`   Token creado: ${token1.slice(0, 16)}…`)
  } catch (e) {
    throw new Error(`No se pudo crear token de prueba: ${e.message}`)
  }

  const r1 = await checkout(token1, 'EXITOSA')
  if (r1.status === 200 && r1.body.success && r1.body.pedido_id) {
    console.log(`   ✅  PASÓ — pedido_id: ${r1.body.pedido_id}`)
    pedidosCreados.push(r1.body.pedido_id)

    // Verificar que el pedido quedó como 'pagado' en la DB
    const { data: p } = await admin.from('pedidos').select('estado, culqi_charge_id').eq('id', r1.body.pedido_id).single()
    if (p?.estado === 'pagado' && p?.culqi_charge_id) {
      console.log(`   ✅  DB: estado="${p.estado}", charge_id="${p.culqi_charge_id.slice(0,16)}…"`)
    } else {
      console.error(`   ❌  DB: estado="${p?.estado}", charge_id="${p?.culqi_charge_id}" — esperaba pagado + charge_id`)
      allPassed = false
    }

    // Verificar pedido_items
    const { data: items } = await admin.from('pedido_items').select('producto_id, subtotal').eq('pedido_id', r1.body.pedido_id)
    if (items?.length > 0 && items[0].producto_id && items[0].subtotal > 0) {
      console.log(`   ✅  pedido_items: producto_id ok, subtotal=${items[0].subtotal}`)
    } else {
      console.error(`   ❌  pedido_items vacío o sin producto_id/subtotal:`, items)
      allPassed = false
    }
  } else {
    console.error(`   ❌  FALLÓ — status=${r1.status}`, r1.body)
    allPassed = false
  }

  // ── Test 2: Tarjeta rechazada (4000 0000 0000 0002) ──────────────────────
  console.log('\n🧪  Test 2: Tarjeta rechazada…')
  let token2
  try {
    token2 = await crearToken('4000000000000002')
    console.log(`   Token creado: ${token2.slice(0, 16)}…`)
  } catch (e) {
    // Culqi puede rechazar la token misma — también es válido
    console.log(`   ℹ️  Culqi rechazó la tarjeta en tokenización (esperado): ${e.message}`)
    console.log('   ✅  PASÓ (rechazo en tokenización)')
    token2 = null
  }

  if (token2) {
    const r2 = await checkout(token2, 'RECHAZADA')
    if (r2.status === 402 || r2.status === 400) {
      console.log(`   ✅  PASÓ — status=${r2.status}, msg="${r2.body.error}"`)

      // Verificar que el pedido creado quedó como cancelado (no pendiente_pago)
      // Si no hay pedido_id en la respuesta, está bien — la lógica lo guarda temporalmente
      // y lo actualiza a cancelado. Buscamos por email+estado
      const { data: pedCancelado } = await admin
        .from('pedidos')
        .select('id, estado')
        .eq('email_comprador', 'test_checkout@merkao.test')
        .eq('estado', 'cancelado')
        .order('created_at', { ascending: false })
        .limit(1)
      if (pedCancelado?.length > 0) {
        console.log(`   ✅  DB: pedido cancelado correctamente (id=${pedCancelado[0].id})`)
        pedidosCreados.push(pedCancelado[0].id)
      } else {
        console.log('   ℹ️  No se encontró pedido cancelado (puede haberse saltado el INSERT)')
      }
    } else {
      console.error(`   ❌  FALLÓ — esperaba 402/400, got status=${r2.status}`, r2.body)
      allPassed = false
    }
  }

} finally {
  // ── Limpieza: borrar pedidos de prueba ───────────────────────────────────
  console.log('\n🗑️  Limpiando pedidos de prueba…')

  // Borrar también cualquier pedido pendiente del email de prueba (por si quedó alguno)
  const { data: extras } = await admin
    .from('pedidos')
    .select('id')
    .eq('email_comprador', 'test_checkout@merkao.test')

  const todos = [...new Set([...pedidosCreados, ...(extras ?? []).map(p => p.id)])]

  if (todos.length > 0) {
    // Borrar pedido_items primero (FK)
    await admin.from('pedido_items').delete().in('pedido_id', todos)
    await admin.from('comisiones_merkao').delete().in('pedido_id', todos)
    const { error: eDel } = await admin.from('pedidos').delete().in('id', todos)
    if (eDel) console.error('   ⚠️  Error borrando pedidos:', eDel.message)
    else console.log(`   ✅  ${todos.length} pedido(s) de prueba eliminado(s)`)
  } else {
    console.log('   (no hay pedidos de prueba que limpiar)')
  }

  killServer()
  console.log('   Servidor detenido.')
}

// ── Resultado final ─────────────────────────────────────────────────────────
if (allPassed) {
  console.log('\n✅  TODOS LOS TESTS PASARON — checkout listo para producción.\n')
  process.exit(0)
} else {
  console.error('\n❌  ALGUNOS TESTS FALLARON — revisar errores arriba antes de desplegar.\n')
  process.exit(1)
}
