// Rate limiter en memoria (token bucket por IP). Sirve para frenar bots
// y spam de cobros en /api/culqi-charge. Limitación: es per-instance, no
// se comparte entre invocaciones serverless en frío. Para producción
// hardening, migrar a @upstash/ratelimit + Vercel KV o Redis.

const WINDOW_MS = 60_000
const MAX_HITS = 5  // 5 cobros/minuto por IP — más que suficiente para checkout legítimo

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

// Limpieza simple para que la map no crezca sin tope en una instancia
// long-running. Solo se ejecuta al consultar; sin timers.
function gc(now: number) {
  if (buckets.size < 1000) return
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): RateLimitResult {
  const now = Date.now()
  const windowMs = opts.windowMs ?? WINDOW_MS
  const max = opts.max ?? MAX_HITS

  gc(now)
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, fresh)
    return { ok: true, remaining: max - 1, resetAt: fresh.resetAt }
  }

  if (existing.count >= max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return { ok: true, remaining: max - existing.count, resetAt: existing.resetAt }
}

// Extrae IP del request. Prioriza headers de proxy (Vercel, Cloudflare).
export function getClientIp(req: Request): string {
  const headers = req.headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  return 'unknown'
}
