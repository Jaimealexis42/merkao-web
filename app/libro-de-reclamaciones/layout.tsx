import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/libro-de-reclamaciones' },
}

export default function ReclamacionesLayout({ children }: { children: React.ReactNode }) {
  return children
}
