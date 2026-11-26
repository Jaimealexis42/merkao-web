import type { Metadata } from 'next'

const MAX_DESCRIPCION = 160

function resumir(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (limpio.length <= MAX_DESCRIPCION) return limpio
  const corte = limpio.slice(0, MAX_DESCRIPCION - 1)
  return `${corte.slice(0, corte.lastIndexOf(' ')).trimEnd()}…`
}

export function metadataPagina(ruta: string, nombre: string, descripcion: string): Metadata {
  return {
    title: `${nombre.trim()} | Merkao`,
    description: resumir(descripcion),
    alternates: { canonical: ruta },
  }
}
