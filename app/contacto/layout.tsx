import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/contacto' },
}

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return children
}
