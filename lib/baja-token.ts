import { createHmac, timingSafeEqual } from 'crypto'

// Firma del enlace "Dejar de recibir estos recordatorios": solo quien recibió
// el correo puede dar de baja a ese vendedor.

function secreto(): string {
  const s = process.env.BAJA_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!s) throw new Error('[baja-token] falta el secreto')
  return s
}

const firma = (vendedorId: string) => createHmac('sha256', secreto()).update('baja:' + vendedorId).digest('hex')

export function verificarBaja(vendedorId: string, token: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(token)) return false
  return timingSafeEqual(Buffer.from(firma(vendedorId), 'hex'), Buffer.from(token, 'hex'))
}

export function urlBaja(vendedorId: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://merkao.org').replace(/\/$/, '')
  return base + '/api/recordatorios/baja?v=' + vendedorId + '&t=' + firma(vendedorId)
}
