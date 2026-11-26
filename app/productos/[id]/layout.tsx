import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { metadataPagina } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const ruta = `/productos/${id}`
  const { data, error } = await supabase
    .from('productos')
    .select('nombre, descripcion')
    .eq('id', id)
    .eq('estado', 'activo')
    .not('vendedor_id', 'is', null)
    .maybeSingle()

  if (error) console.error('[seo/producto]', id, error.message)
  if (!data) return { alternates: { canonical: ruta } }

  return metadataPagina(ruta, data.nombre, data.descripcion || `Compra ${data.nombre} en Merkao con Pago Escrow.`)
}

export default function ProductoLayout({ children }: { children: React.ReactNode }) {
  return children
}
