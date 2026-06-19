'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { isAdminEmail } from '@/lib/admin'

type Metricas = {
  usuarios: number
  vendedores: number
  visitas: number
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-PE')
}

export default function AdminMetricasPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/admin/metricas')
      return
    }
    if (!isAdminEmail(user.email)) {
      router.replace('/')
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        if (!cancelled) {
          setError('Sesión expirada. Recarga la página.')
          setLoading(false)
        }
        return
      }
      try {
        const res = await fetch('/api/admin/metricas', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          if (!cancelled) {
            setError(j.error ?? 'No se pudo cargar.')
            setLoading(false)
          }
          return
        }
        const json = (await res.json()) as Metricas
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Error de red.')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router])

  if (authLoading || (!user && !authLoading)) {
    return <div style={{ padding: 32, fontFamily: 'system-ui' }}>Cargando…</div>
  }
  if (!isAdminEmail(user?.email)) {
    return null
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '32px 20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#0b1220',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Métricas Merkao</h1>
        <p style={{ margin: '4px 0 0', color: '#52607a' }}>
          Panel admin · {user?.email}
        </p>
      </header>

      {loading ? (
        <div style={{ padding: 24, background: '#f4f6fb', borderRadius: 12 }}>
          Cargando métricas…
        </div>
      ) : error ? (
        <div
          style={{
            padding: 24,
            background: '#fde9ea',
            borderRadius: 12,
            color: '#9a1c25',
          }}
        >
          {error}
        </div>
      ) : !data ? null : (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <BigCard label="Visitas totales" value={fmtNum(data.visitas)} tone="navy" />
          <BigCard label="Usuarios totales" value={fmtNum(data.usuarios)} tone="green" />
          <BigCard label="Vendedores" value={fmtNum(data.vendedores)} tone="amber" />
        </section>
      )}
    </div>
  )
}

function BigCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'navy' | 'green' | 'amber'
}) {
  const bg = tone === 'navy' ? '#e7edfa' : tone === 'green' ? '#e3f6e8' : '#fff6e0'
  const fg = tone === 'navy' ? '#1a3a8a' : tone === 'green' ? '#1b5e20' : '#7a4a00'
  return (
    <div style={{ background: bg, color: fg, padding: '24px 22px', borderRadius: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 42, fontWeight: 800, marginTop: 6, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  )
}
