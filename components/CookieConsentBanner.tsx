'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readConsent, writeConsent } from '@/lib/consent'

export function CookieConsentBanner() {
  // null mientras hidrata; luego: true si no hay cookie de consentimiento.
  const [show, setShow] = useState<boolean | null>(null)

  useEffect(() => {
    setShow(readConsent() === null)
  }, [])

  if (!show) return null

  return (
    <div className="mk-cc" role="dialog" aria-label="Aviso de cookies" aria-live="polite">
      <div className="mk-cc-inner">
        <div className="mk-cc-text">
          <strong>Usamos cookies.</strong>{' '}
          Las cookies técnicas (sesión, carrito, checkout) son necesarias para que
          Merkao funcione. Las cookies analíticas (Google Analytics) nos ayudan a
          mejorar el sitio y solo se cargan si las aceptás. Más info en{' '}
          <Link className="mk-cc-link" href="/cookies">Política de cookies</Link>{' y '}
          <Link className="mk-cc-link" href="/privacidad">Privacidad</Link>.
        </div>
        <div className="mk-cc-actions">
          <button
            type="button"
            className="mk-btn mk-btn-ghost"
            onClick={() => {
              writeConsent('rejected')
              setShow(false)
            }}
          >
            Rechazar
          </button>
          <button
            type="button"
            className="mk-btn mk-btn-primary"
            onClick={() => {
              writeConsent('accepted')
              setShow(false)
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
