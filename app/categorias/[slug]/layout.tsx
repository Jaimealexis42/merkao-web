import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { alternates: { canonical: `/categorias/${slug}` } }
}

export default function CategoriaLayout({ children }: { children: React.ReactNode }) {
  return children
}
