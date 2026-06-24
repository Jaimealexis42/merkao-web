// Consentimiento de cookies analíticas (GA4).
// La elección se guarda en una cookie propia (NO localStorage) con duración 1 año.
// Cuando cambia, se emite un evento custom en window para que <GoogleAnalytics>
// monte/desmonte sus scripts sin esperar a un reload.

export const CONSENT_COOKIE = 'mk_cookie_consent'
export const CONSENT_EVENT = 'mk-consent-change'
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export type ConsentValue = 'accepted' | 'rejected'

export function readConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const c of cookies) {
    const eq = c.indexOf('=')
    if (eq === -1) continue
    if (c.substring(0, eq) !== CONSENT_COOKIE) continue
    const raw = decodeURIComponent(c.substring(eq + 1))
    if (raw === 'accepted' || raw === 'rejected') return raw
    return null
  }
  return null
}

export function writeConsent(value: ConsentValue): void {
  if (typeof document === 'undefined') return
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }))
  }
}
