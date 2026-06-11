'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

const ADMIN_EMAIL = 'alexisaranap21@gmail.com'

type ComisionItem = {
  id: string
  pedido_id: string
  vendedor_id: string | null
  vendedor_nombre: string
  nombre_comprador: string
  monto_total: number
  monto_merkao: number
  monto_vendedor: number
  estado: 'pendiente' | 'liberado'
  created_at: string
}

type PorVendedor = {
  vendedor_id: string
  vendedor_nombre: string
  pendiente: number
  liberado: number
}

type Snapshot = {
  items: ComisionItem[]
  totales: { merkao_pendiente: number; merkao_liberado: number }
  por_vendedor: PorVendedor[]
}

function money(n: number) {
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type Tab = 'pendientes' | 'liberadas'

export default function AdminComisionesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pendientes')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/admin/comisiones')
      return
    }
    if ((user.email ?? '').toLowerCase() !== ADMIN_EMAIL) {
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
        const res = await fetch('/api/admin/comisiones', {
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
        const json = (await res.json()) as Snapshot
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

  if ((user?.email ?? '').toLowerCase() !== ADMIN_EMAIL) {
    return null
  }

  const items = data?.items ?? []
  const shown = items.filter((i) => (tab === 'pendientes' ? i.estado === 'pendiente' : i.estado === 'liberado'))
  const totalMerkao = (data?.totales.merkao_pendiente ?? 0) + (data?.totales.merkao_liberado ?? 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', color: '#0b1220' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Comisiones Merkao</h1>
        <p style={{ margin: '4px 0 0', color: '#52607a' }}>
          Panel admin · {user?.email}
        </p>
      </header>

      {loading ? (
        <div style={{ padding: 24, background: '#f4f6fb', borderRadius: 12 }}>Cargando ledger…</div>
      ) : error ? (
        <div style={{ padding: 24, background: '#fde9ea', borderRadius: 12, color: '#9a1c25' }}>
          {error}
        </div>
      ) : !data ? null : (
        <>
          {/* KPIs */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Kpi label="Merkao pendiente" value={money(data.totales.merkao_pendiente)} tone="amber" />
            <Kpi label="Merkao liberado" value={money(data.totales.merkao_liberado)} tone="green" />
            <Kpi label="Total acumulado Merkao" value={money(totalMerkao)} tone="navy" />
            <Kpi label="N° transacciones" value={String(items.length)} tone="neutral" />
          </section>

          {/* Por vendedor */}
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>A pagar por vendedor</h2>
            <div style={{ overflowX: 'auto', border: '1px solid #e3e8f1', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: '#f4f6fb' }}>
                  <tr>
                    <Th>Vendedor</Th>
                    <Th align="right">Pendiente al vendedor</Th>
                    <Th align="right">Ya liberado</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.por_vendedor.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#52607a' }}>Sin datos todavía.</td></tr>
                  ) : (
                    data.por_vendedor.map((v) => (
                      <tr key={v.vendedor_id || v.vendedor_nombre} style={{ borderTop: '1px solid #eef2f7' }}>
                        <Td>{v.vendedor_nombre}</Td>
                        <Td align="right" strong={v.pendiente > 0}>{money(v.pendiente)}</Td>
                        <Td align="right">{money(v.liberado)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Detalle */}
          <section>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <TabBtn active={tab === 'pendientes'} onClick={() => setTab('pendientes')}>
                Pendientes ({items.filter((i) => i.estado === 'pendiente').length})
              </TabBtn>
              <TabBtn active={tab === 'liberadas'} onClick={() => setTab('liberadas')}>
                Liberadas ({items.filter((i) => i.estado === 'liberado').length})
              </TabBtn>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #e3e8f1', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f4f6fb' }}>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Pedido</Th>
                    <Th>Comprador</Th>
                    <Th>Vendedor</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Merkao</Th>
                    <Th align="right">Vendedor</Th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#52607a' }}>
                        Sin comisiones {tab === 'pendientes' ? 'pendientes' : 'liberadas'}.
                      </td>
                    </tr>
                  ) : (
                    shown.map((it) => (
                      <tr key={it.id} style={{ borderTop: '1px solid #eef2f7' }}>
                        <Td>{fmt(it.created_at)}</Td>
                        <Td>
                          <code style={{ fontSize: 12 }}>{it.pedido_id.slice(0, 8)}</code>
                        </Td>
                        <Td>{it.nombre_comprador}</Td>
                        <Td>{it.vendedor_nombre}</Td>
                        <Td align="right">{money(it.monto_total)}</Td>
                        <Td align="right" strong>{money(it.monto_merkao)}</Td>
                        <Td align="right">{money(it.monto_vendedor)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'green' | 'navy' | 'neutral' }) {
  const bg =
    tone === 'amber' ? '#fff6e0' :
    tone === 'green' ? '#e3f6e8' :
    tone === 'navy'  ? '#e7edfa' : '#f4f6fb'
  const fg =
    tone === 'amber' ? '#7a4a00' :
    tone === 'green' ? '#1b5e20' :
    tone === 'navy'  ? '#1a3a8a' : '#0b1220'
  return (
    <div style={{ background: bg, color: fg, padding: '14px 16px', borderRadius: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{ textAlign: align ?? 'left', padding: '10px 12px', fontWeight: 600, color: '#52607a' }}>
      {children}
    </th>
  )
}

function Td({ children, align, strong }: { children: React.ReactNode; align?: 'left' | 'right'; strong?: boolean }) {
  return (
    <td style={{ textAlign: align ?? 'left', padding: '10px 12px', fontWeight: strong ? 600 : 400 }}>
      {children}
    </td>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        border: '1px solid ' + (active ? '#1a3a8a' : '#d6dde9'),
        background: active ? '#1a3a8a' : '#fff',
        color: active ? '#fff' : '#0b1220',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
