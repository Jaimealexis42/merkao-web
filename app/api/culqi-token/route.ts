import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Proxy server-side de tokenización Culqi.
//
// ¿Por qué existe este endpoint?
//   - `pk_live` solo acepta orígenes whitelisteados en el panel de Culqi.
//     La app móvil (Expo) sirve desde `localhost:8081` en dev y desde un
//     `exp://` scheme en device, ninguno de los cuales está en la whitelist.
//   - Llamar a `api.culqi.com/v2/tokens` server-side evita CORS y la
//     restricción de Origin: Culqi solo ve a Vercel haciendo el request.
//
// Seguridad:
//   - Rate-limit 10/min/IP (más permisivo que `/api/culqi-charge` porque
//     el user puede equivocarse al tipear la tarjeta).
//   - Validación estricta de inputs antes de tocar la red.
//   - Logs sin PAN (solo last4 de la tarjeta).
//   - Solo usa la PUBLIC key (`NEXT_PUBLIC_CULQI_PUBLIC_KEY`) — sigue siendo
//     una key pública por diseño de Culqi. La secret nunca toca este path.
//   - CORS abierto para que la app móvil pueda llamarlo desde cualquier
//     origen (browser web o native fetch).

const CULQI_TOKENS_URL = 'https://api.culqi.com/v2/tokens'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
} as const

function json(body: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(body, init)
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v)
  return res
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function onlyDigits(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const d = v.replace(/\D/g, '')
  return d.length > 0 ? d : null
}

export async function POST(req: NextRequest) {
  // ── 0. Guard: PK pública debe existir en env ─────────────────────
  const pk = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
  if (!pk) {
    console.error('[culqi-token] NEXT_PUBLIC_CULQI_PUBLIC_KEY no configurada')
    return json(
      { error: 'Servicio de pagos no disponible. Contacta soporte.' },
      { status: 500 },
    )
  }

  // ── 1. Rate limit por IP (10/min) ────────────────────────────────
  const ip = getClientIp(req)
  const rl = checkRateLimit(`culqi-token:${ip}`, { max: 10 })
  if (!rl.ok) {
    return json(
      { error: 'Demasiados intentos. Espera un minuto antes de volver a intentar.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
        },
      },
    )
  }

  // ── 2. Body parsing ──────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const cardNumber = onlyDigits(body.card_number)
  const cvv = onlyDigits(body.cvv)
  const expMonth = onlyDigits(body.expiration_month)
  const expYear = onlyDigits(body.expiration_year)
  const email = typeof body.email === 'string' ? body.email.trim() : null

  // ── 3. Validación estricta ──────────────────────────────────────
  if (!cardNumber || cardNumber.length < 12 || cardNumber.length > 19) {
    return json({ error: 'Número de tarjeta inválido.' }, { status: 400 })
  }
  if (!cvv || cvv.length < 3 || cvv.length > 4) {
    return json({ error: 'CVV inválido.' }, { status: 400 })
  }
  if (!expMonth) {
    return json({ error: 'Mes de expiración inválido.' }, { status: 400 })
  }
  const mm = parseInt(expMonth, 10)
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) {
    return json({ error: 'Mes de expiración fuera de rango (1-12).' }, { status: 400 })
  }
  if (!expYear || expYear.length !== 4) {
    return json({ error: 'Año de expiración inválido (YYYY).' }, { status: 400 })
  }
  const yy = parseInt(expYear, 10)
  const currentYear = new Date().getUTCFullYear()
  if (!Number.isFinite(yy) || yy < currentYear || yy > currentYear + 25) {
    return json({ error: 'Año de expiración fuera de rango.' }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'Email inválido.' }, { status: 400 })
  }

  // ── 4. Llamar a Culqi server-side ───────────────────────────────
  let culqiRes: Response
  let culqiData: Record<string, unknown>
  try {
    culqiRes = await fetch(CULQI_TOKENS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pk}`,
      },
      body: JSON.stringify({
        card_number: cardNumber,
        cvv,
        expiration_month: String(mm).padStart(2, '0'),
        expiration_year: String(yy),
        email,
      }),
    })
    culqiData = (await culqiRes.json()) as Record<string, unknown>
  } catch {
    return json(
      { error: 'No se pudo conectar con el proveedor de pagos.' },
      { status: 502 },
    )
  }

  if (!culqiRes.ok || culqiData.object === 'error') {
    const last4 = cardNumber.slice(-4)
    console.warn(
      '[culqi-token] Culqi rechazó token:',
      'status=' + culqiRes.status,
      'last4=' + last4,
      'msg=' + (culqiData.user_message ?? culqiData.merchant_message ?? 'sin mensaje'),
    )
    const mensaje =
      (culqiData.user_message as string) ??
      (culqiData.merchant_message as string) ??
      'Error al validar la tarjeta.'
    return json({ error: mensaje }, { status: culqiRes.status === 401 ? 401 : 400 })
  }

  const token = culqiData.id as string | undefined
  if (!token) {
    console.error('[culqi-token] Culqi devolvió 200 sin id:', culqiData)
    return json({ error: 'Culqi no devolvió un token válido.' }, { status: 502 })
  }

  return json({ token }, { status: 200 })
}
