import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { CATEGORIAS } from '@/lib/categorias'

// Se regenera como máximo una vez por hora.
export const revalidate = 3600

const BASE = 'https://merkao.org'
const LOTE = 1000 // máximo de filas por consulta en Supabase

type Fila = { id: string; vendedor_id: string }

async function productosActivos(): Promise<Fila[]> {
  const filas: Fila[] = []
  for (let desde = 0; ; desde += LOTE) {
    const { data, error } = await supabase
      .from('productos')
      .select('id, vendedor_id')
      .eq('estado', 'activo')
      .not('vendedor_id', 'is', null)
      .order('id')
      .range(desde, desde + LOTE - 1)
    // Fallar es mejor que publicar un sitemap incompleto: se conserva el anterior.
    if (error) throw new Error(`sitemap productos: ${error.message}`)
    filas.push(...(data as Fila[]))
    if (data.length < LOTE) return filas
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productos, tiendas] = await Promise.all([
    productosActivos(),
    supabase.from('tiendas').select('id'),
  ])
  if (tiendas.error) throw new Error(`sitemap tiendas: ${tiendas.error.message}`)

  // Vendedor real = tiene tienda registrada. Las tiendas sin productos activos no se listan.
  const registradas = new Set(tiendas.data.map((t) => t.id as string))
  const publicables = productos.filter((p) => registradas.has(p.vendedor_id))
  const conProductos = [...new Set(publicables.map((p) => p.vendedor_id))]

  const rutas = [
    '',
    '/categorias',
    ...CATEGORIAS.map((c) => `/categorias/${c.slug}`),
    ...publicables.map((p) => `/productos/${p.id}`),
    ...conProductos.map((id) => `/tienda/${id}`),
  ]
  return rutas.map((ruta) => ({ url: `${BASE}${ruta}` }))
}
