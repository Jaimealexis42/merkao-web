import { createHmac, timingSafeEqual } from 'crypto'

export type EscrowAction = 'ok' | 'problema'

function secret(): string {
  const s = process.env.ESCROW_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!s) throw new Error('[escrow-token] ESCROW_TOKEN_SECRET no configurado')
  return s
}

export function generarToken(pedidoId: string, action: EscrowAction): string {
  return createHmac('sha256', secret()).update(`${pedidoId}:${action}`).digest('hex')
}

export function verificarToken(pedidoId: string, action: EscrowAction, token: string): boolean {
  if (!token || token.length !== 64) return false
  try {
    const expected = Buffer.from(generarToken(pedidoId, action), 'hex')
    const received = Buffer.from(token, 'hex')
    if (expected.length !== received.length) return false
    return timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

export function urlsEscrow(pedidoId: string): { ok: string; problema: string } {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://merkao.org').replace(/\/$/, '')
  return {
    ok:       `${base}/api/escrow/confirmar?p=${pedidoId}&a=ok&t=${generarToken(pedidoId, 'ok')}`,
    problema: `${base}/api/escrow/confirmar?p=${pedidoId}&a=problema&t=${generarToken(pedidoId, 'problema')}`,
  }
}
