// Consulta productos con foto — lee claves de .env.local sin imprimirlas
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '..', '.env.local')

const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const url = env['NEXT_PUBLIC_SUPABASE_URL']
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
if (!url || !key) { console.error('Faltan vars de env'); process.exit(1) }

const sb = createClient(url, key)

// Todos los estados — queremos ver cuántos hay y cuáles tienen fotos
const { data: todos, error: errT } = await sb
  .from('productos')
  .select('id, nombre, vendedor_id, imagenes, estado, created_at')
  .order('created_at', { ascending: false })

if (errT) { console.error('Error:', errT.message); process.exit(1) }

const conFoto = (todos || []).filter(p => Array.isArray(p.imagenes) && p.imagenes.length > 0)

// Resumen por estado
const estados = {}
for (const p of todos || []) {
  estados[p.estado] = (estados[p.estado] || 0) + 1
}
console.log('\nResumen de productos por estado:')
for (const [e, n] of Object.entries(estados)) console.log(`  ${e}: ${n}`)
console.log(`\nTotal con foto (cualquier estado): ${conFoto.length}`)

if (conFoto.length === 0) { console.log('No hay productos con foto.'); process.exit(0) }

const vendedorIds = [...new Set(conFoto.map(p => p.vendedor_id).filter(Boolean))]
const { data: tiendas } = await sb
  .from('tiendas')
  .select('id, nombre')
  .in('id', vendedorIds)

const tMap = new Map((tiendas || []).map(t => [t.id, t.nombre]))

const EN_CARRUSEL = new Set([
  '8ca99cc8-9c5c-44e1-b12f-22cefb3333db',
  '45a96305-c019-49e6-9b52-e6185baf1d53',
])

console.log('\n' + '='.repeat(65))
for (const p of conFoto) {
  const vendedor = tMap.get(p.vendedor_id) || p.vendedor_id || '(sin tienda)'
  const fecha    = p.created_at ? new Date(p.created_at).toLocaleDateString('es-PE') : '?'
  const enCarr   = EN_CARRUSEL.has(p.id) ? '✅ ya en carrusel' : '🆕 NUEVO'
  console.log(`${enCarr}`)
  console.log(`  Nombre  : ${p.nombre}`)
  console.log(`  Vendedor: ${vendedor}`)
  console.log(`  Fecha   : ${fecha}`)
  console.log(`  Estado  : ${p.estado}`)
  console.log(`  ID      : ${p.id}`)
  console.log(`  Fotos   : ${p.imagenes.length}`)
  console.log(`  URL[0]  : ${p.imagenes[0]}`)
  console.log('-'.repeat(65))
}
