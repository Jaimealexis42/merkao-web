'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admin'

interface Props {
  /** Path a registrar. Default: window.location.pathname al montar. */
  path?: string
}

/**
 * Tracker fire-and-forget: en mount dispara un INSERT a `page_views`. No
 * bloquea el render (corre en useEffect, post-paint) y los errores se
 * ignoran silenciosamente — la métrica es marketing, no transaccional.
 *
 * El INSERT pasa por la anon key vía la policy `page_views_insert_anon`.
 * Si la sesión activa es de un email en la allowlist admin (lib/admin),
 * NO cuenta — evita inflar la métrica con navegación del propio operador.
 */
export default function TrackPageView({ path }: Props) {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        if (isAdminEmail(session?.user?.email)) return
        const target =
          path ??
          (typeof window !== 'undefined' ? window.location.pathname : null)
        await supabase.from('page_views').insert({ path: target })
      } catch {
        // ignore — failure tolerada
      }
    })()
    return () => {
      cancelled = true
    }
  }, [path])

  return null
}
