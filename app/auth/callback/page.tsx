'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Maneja el retorno del OAuth provider (Google).
// Cubre los dos flows posibles:
//   - PKCE     → Supabase envía ?code=... en la query y hay que intercambiarlo.
//   - Implicit → tokens vienen en el hash #access_token=... y supabase-js
//                los pickea solo con detectSessionInUrl=true (default).
// En ambos casos, después confirmamos la sesión con getSession() y redirigimos.

function AuthCallback() {
  const router = useRouter()
  const params = useSearchParams()
  const [estado, setEstado] = useState<'cargando' | 'error'>('cargando')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false

    ;(async () => {
      // 1) Error explícito de Google/Supabase llega como ?error=...&error_description=...
      const oauthError = params.get('error_description') || params.get('error')
      if (oauthError) {
        if (!cancel) {
          setEstado('error')
          setErrorMsg(decodeURIComponent(oauthError))
        }
        return
      }

      // 2) PKCE flow → intercambiar el code
      const code = params.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancel) return
        if (error) {
          setEstado('error')
          setErrorMsg(error.message)
          return
        }
      }

      // 3) Implicit flow ya fue parseado del hash por supabase-js. Confirmamos.
      const { data, error } = await supabase.auth.getSession()
      if (cancel) return
      if (error || !data.session) {
        setEstado('error')
        setErrorMsg(error?.message ?? 'No se pudo iniciar sesión con Google.')
        return
      }

      // 4) Sesión OK → redirigir.
      // Si el usuario indicó destino con ?next=/ruta lo respetamos (mismo-origin).
      const next = params.get('next')
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
      router.replace(safeNext)
    })()

    return () => { cancel = true }
  }, [router, params])

  if (estado === 'error') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="text-lg font-black text-gray-800">No se pudo iniciar sesión</h1>
          <p className="text-sm text-gray-500 mt-2 break-words">{errorMsg}</p>
          <a
            href="/login"
            className="mt-5 inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition"
          >
            Volver al login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Iniciando sesión…</p>
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-400 text-sm animate-pulse">Cargando…</p>
        </main>
      }
    >
      <AuthCallback />
    </Suspense>
  )
}
