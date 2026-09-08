'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { isAdminEmail } from '@/lib/admin'

type Metricas = {
  usuarios:        number
  vendedores:      number
  visitas:         number
  productos_total: number
  productos_con:   number
  productos_sin:   number
  pedidos_total:   number
  ventas_totales:  number
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-PE')
}

function fmtSoles(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AdminMetricasPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData]     = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login?redirect=/admin/metricas'); return }
    if (!isAdminEmail(user.email)) { router.replace('/'); return }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        if (!cancelled) { setError('Sesión expirada. Recarga la página.'); setLoading(false) }
        return
      }
      try {
        const res = await fetch('/api/admin/metricas', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          if (!cancelled) { setError(j.error ?? 'No se pudo cargar.'); setLoading(false) }
          return
        }
        const json = (await res.json()) as Metricas
        if (!cancelled) { setData(json); setLoading(false) }
      } catch {
        if (!cancelled) { setError('Error de red.'); setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [authLoading, user, router])

  if (authLoading || (!user && !authLoading)) {
    return <div style={{ padding: 32, fontFamily: 'system-ui' }}>Cargando…</div>
  }
  if (!isAdminEmail(user?.email)) return null

  const GRID: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', color: '#0b1220' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Métricas Merkao</h1>
        <p style={{ margin: '4px 0 0', color: '#52607a' }}>Panel admin · {user?.email}</p>
      </header>

      {loading ? (
        <div style={{ padding: 24, background: '#f4f6fb', borderRadius: 12 }}>Cargando métricas…</div>
      ) : error ? (
        <div style={{ padding: 24, background: '#fde9ea', borderRadius: 12, color: '#9a1c25' }}>{error}</div>
      ) : !data ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Sección 1: Plataforma */}
          <section>
            <SectionTitle>Plataforma</SectionTitle>
            <div style={GRID}>
              <BigCard label="Visitas totales"   value={fmtNum(data.visitas)}    tone="navy" />
              <BigCard label="Usuarios totales"  value={fmtNum(data.usuarios)}   tone="green" />
              <BigCard label="Vendedores activos" value={fmtNum(data.vendedores)} tone="amber" />
            </div>
          </section>

          {/* Sección 2: Catálogo */}
          <section>
            <SectionTitle>Catálogo de vendedores reales</SectionTitle>
            <div style={GRID}>
              <BigCard
                label="Productos publicados"
                value={fmtNum(data.productos_total)}
                tone="navy"
              />
              <StatCard
                label="Con foto"
                value={fmtNum(data.productos_con)}
                sub={data.productos_total > 0
                  ? `${Math.round(data.productos_con / data.productos_total * 100)}% del catálogo`
                  : '—'}
                good
              />
              <StatCard
                label="Sin foto"
                value={fmtNum(data.productos_sin)}
                sub={data.productos_sin > 0 ? 'Necesitan imagen' : 'Todos tienen foto'}
                good={data.productos_sin === 0}
              />
            </div>
          </section>

          {/* Sección 3: Ventas */}
          <section>
            <SectionTitle>Ventas y pedidos</SectionTitle>
            <div style={GRID}>
              <BigCard
                label="Pedidos realizados"
                value={fmtNum(data.pedidos_total)}
                tone="amber"
              />
              <BigCard
                label="Ventas completadas"
                value={data.ventas_totales > 0 ? fmtSoles(data.ventas_totales) : 'S/ 0.00'}
                tone="green"
                sub={data.ventas_totales === 0 ? 'Aún sin ventas liberadas' : undefined}
              />
            </div>
          </section>

        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px' }}>
      {children}
    </h2>
  )
}

function BigCard({ label, value, tone, sub }: {
  label: string
  value: string
  tone: 'navy' | 'green' | 'amber'
  sub?: string
}) {
  const bg = tone === 'navy' ? '#e7edfa' : tone === 'green' ? '#e3f6e8' : '#fff6e0'
  const fg = tone === 'navy' ? '#1a3a8a' : tone === 'green' ? '#1b5e20' : '#7a4a00'
  return (
    <div style={{ background: bg, color: fg, padding: '22px 20px', borderRadius: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 800, marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 6, opacity: .7 }}>{sub}</div>}
    </div>
  )
}

function StatCard({ label, value, sub, good }: {
  label: string
  value: string
  sub: string
  good: boolean
}) {
  const bg = good ? '#e3f6e8' : '#fff6e0'
  const fg = good ? '#1b5e20' : '#7a4a00'
  const dot = good ? '#16a34a' : '#d97706'
  return (
    <div style={{ background: bg, color: fg, padding: '22px 20px', borderRadius: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, opacity: .85, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
        {label}
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, marginTop: 6, opacity: .75 }}>{sub}</div>
    </div>
  )
}
