'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { CONSENT_EVENT, readConsent, type ConsentValue } from '@/lib/consent'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== 'function') return
    const query = searchParams?.toString()
    const url = query ? `${pathname}?${query}` : pathname
    window.gtag('event', 'page_view', {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [pathname, searchParams])

  return null
}

export function GoogleAnalytics() {
  // Por defecto NO carga GA4. Solo se monta cuando el usuario aceptó las
  // cookies analíticas (Ley 29733). La cookie mk_cookie_consent persiste la
  // elección entre sesiones.
  const [consent, setConsent] = useState<ConsentValue | null>(null)

  useEffect(() => {
    setConsent(readConsent())
    function onChange(e: Event) {
      const detail = (e as CustomEvent<ConsentValue>).detail
      setConsent(detail === 'accepted' || detail === 'rejected' ? detail : null)
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  if (!GA_ID) return null
  if (consent !== 'accepted') return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  )
}
