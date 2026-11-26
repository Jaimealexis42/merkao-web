import type { Metadata } from 'next'
import { CATEGORIAS } from '@/lib/categorias'
import { metadataPagina } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const ruta = `/categorias/${slug}`
  const categoria = CATEGORIAS.find((c) => c.slug === slug)
  if (!categoria) return { alternates: { canonical: ruta } }

  return metadataPagina(ruta, categoria.nombre, categoria.descripcion)
}

export default function CategoriaLayout({ children }: { children: React.ReactNode }) {
  return children
}
