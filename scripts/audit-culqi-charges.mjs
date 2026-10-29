/**
 * Auditoría de cargos Culqi: detecta cobros sin pedido en la DB.
 * Solo lectura — no reembolsa nada.
 *
 * USO: node scripts/audit-culqi-charges.mjs
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const env = {}
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const CULQI_SECRET = env['CULQI_SECRET_KEY']
const SUPA_URL     = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPA_SVC     = env['SUPABASE_SERVICE_ROLE_KEY']

if (!CULQI_SECRET || !SUPA_URL || !SUPA_SVC) {
  console.error('❌  Faltan claves en .env.local'); process.exit(1)
}

const admin = createClient(SUPA_URL, SUPA_SVC, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

// ── Paginar todos los cargos Culqi ──────────────────────────────────────────
console.log('\n🔍  Descargando cargos de Culqi…')
let allCharges = []
let after = null

// Culqi v2 usa limit + after para paginar
do {
  const url = new URL('https://api.culqi.com/v2/charges')
  url.searchParams.set('limit', '100')
  if (after) url.searchParams.set('after', after)

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${CULQI_SECRET}` },
  })
  const data = await res.json()

  if (!res.ok || data.object === 'error') {
    console.error('❌  Error Culqi:', data.merchant_message ?? JSON.stringify(data))
    process.exit(1)
  }

  const items = data.data ?? []
  allCharges = allCharges.concat(items)
  console.log(`   … ${allCharges.length} cargos descargados`)

  // has_more + last id para siguiente página
  after = data.has_more && items.length > 0 ? items[items.length - 1].id : null
} while (after)

console.log(`   Total: ${allCharges.length} cargos`)

// ── Filtrar solo cargos de Merkao (excluir PresupIA) ─────────────────────
// PresupIA usa descriptions distintas. Los de Merkao dicen "Merkao –" o contienen
// el email del vendedor/comprador de tiendas de Merkao.
const merkaoCharges = allCharges.filter(c => {
  const desc = (c.description ?? '').toLowerCase()
  return desc.includes('merkao') && !desc.includes('presupia') && !desc.includes('presupuesto')
})
console.log(`   Cargos de Merkao: ${merkaoCharges.length}`)

if (merkaoCharges.length === 0) {
  console.log('\n✅  No hay cargos de Merkao en Culqi.\n')
  process.exit(0)
}

// ── Buscar cada charge_id en la tabla pedidos ────────────────────────────
const chargeIds = merkaoCharges.map(c => c.id)

// Supabase no tiene una API directa para IN sobre culqi_charge_id si hay muchos.
// Hacemos la query en lotes de 100.
const { data: pedidos, error: epedidos } = await admin
  .from('pedidos')
  .select('culqi_charge_id, id, estado, total')
  .in('culqi_charge_id', chargeIds)

if (epedidos) {
  console.error('❌  Error consultando pedidos:', epedidos.message); process.exit(1)
}

const pedidosByCharge = new Map((pedidos ?? []).map(p => [p.culqi_charge_id, p]))

// ── Reporte ─────────────────────────────────────────────────────────────────
const huerfanos = merkaoCharges.filter(c => !pedidosByCharge.has(c.id))
const conPedido = merkaoCharges.filter(c =>  pedidosByCharge.has(c.id))

console.log(`\n${'='.repeat(65)}`)
console.log(`CARGOS CON PEDIDO EN DB: ${conPedido.length}`)
for (const c of conPedido) {
  const p = pedidosByCharge.get(c.id)
  const fecha = new Date(c.creation_date * 1000).toLocaleString('es-PE', { timeZone: 'America/Lima' })
  const monto = (c.amount / 100).toFixed(2)
  console.log(`  ✅  ${fecha}  S/ ${monto}  ${c.email}  ${c.id}  pedido:${p.id} [${p.estado}]`)
}

console.log(`\nCARGOS SIN PEDIDO EN DB (HUÉRFANOS): ${huerfanos.length}`)
if (huerfanos.length === 0) {
  console.log('  Ninguno — todo OK.')
} else {
  for (const c of huerfanos) {
    const fecha = new Date(c.creation_date * 1000).toLocaleString('es-PE', { timeZone: 'America/Lima' })
    const monto = (c.amount / 100).toFixed(2)
    const estado = c.outcome?.type ?? c.status ?? '?'
    console.log(`\n  ⚠️  HUÉRFANO`)
    console.log(`     Fecha  : ${fecha}`)
    console.log(`     Monto  : S/ ${monto}`)
    console.log(`     Email  : ${c.email}`)
    console.log(`     Cargo  : ${c.id}`)
    console.log(`     Estado : ${estado}`)
    console.log(`     Desc   : ${c.description}`)
  }
}
console.log(`${'='.repeat(65)}\n`)
console.log('NOTA: Este script es de solo lectura. No se realizó ningún reembolso.')
