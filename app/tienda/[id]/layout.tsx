import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { metadataPagina } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const ruta = `/tienda/${id}`
  const { data, error } = await supabase
    .from('tiendas')
    .select('nombre, descripcion')
    .eq('id', id)
    .maybeSingle()

  if (error) console.error('[seo/tienda]', id, error.message)
  if (!data?.nombre) return { alternates: { canonical: ruta } }

  return metadataPagina(
    ruta,
    data.nombre,
    data.descripcion?.trim() || `Productos de ${data.nombre} en Merkao, con Pago Escrow y envío en Perú.`,
  )
}

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children
}
