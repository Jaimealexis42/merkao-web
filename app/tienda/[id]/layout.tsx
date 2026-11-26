import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { alternates: { canonical: `/tienda/${id}` } }
}

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children
}
