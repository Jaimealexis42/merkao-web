'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { isAdminEmail } from '@/lib/admin'

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
  pagado_a_vendedor: boolean
  pagado_at: string | null
}

type PorVendedor = {
  vendedor_id: string
  vendedor_nombre: string
  pendiente: number
  por_pagar: number
  pagado: number
}

type Snapshot = {
  items: ComisionItem[]
  totales: {
    merkao_pendiente: number
    merkao_liberado: number
    vendedor_pagado: number
    vendedor_pendiente_pagar: number
  }
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
  const [confirmPay, setConfirmPay] = useState<ComisionItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/admin/comisiones')
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

  const marcarPagado = async (it: ComisionItem) => {
    if (submitting) return
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setToast('Sesión expirada. Recarga la página.')
      setSubmitting(false)
      setConfirmPay(null)
      setTimeout(() => setToast(''), 3000)
      return
    }
    try {
      const res = await fetch('/api/admin/comisiones/marcar-pagado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comision_id: it.id }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setToast(j.error ?? 'No se pudo marcar como pagado.')
      } else {
        const j = (await res.json()) as { pagado_at?: string }
        const newPagadoAt = j.pagado_at ?? new Date().toISOString()
        setData((prev) => {
          if (!prev) return prev
          const items = prev.items.map((row) =>
            row.id === it.id ? { ...row, pagado_a_vendedor: true, pagado_at: newPagadoAt } : row,
          )
          // Recalcular totales y por_vendedor ahorra un refetch.
          let merkao_pendiente = 0
          let merkao_liberado = 0
          let vendedor_pagado = 0
          let vendedor_pendiente_pagar = 0
          const porVendedor = new Map<string, PorVendedor>()
          for (const r of items) {
            if (r.estado === 'pendiente') merkao_pendiente += r.monto_merkao
            else merkao_liberado += r.monto_merkao
            if (r.estado === 'liberado') {
              if (r.pagado_a_vendedor) vendedor_pagado += r.monto_vendedor
              else vendedor_pendiente_pagar += r.monto_vendedor
            }
            const key = r.vendedor_id ?? '__sin_vendedor__'
            const existing = porVendedor.get(key) ?? {
              vendedor_id: r.vendedor_id ?? '',
              vendedor_nombre: r.vendedor_nombre,
              pendiente: 0,
              por_pagar: 0,
              pagado: 0,
            }
            if (r.estado === 'pendiente') existing.pendiente += r.monto_vendedor
            else if (r.pagado_a_vendedor) existing.pagado += r.monto_vendedor
            else existing.por_pagar += r.monto_vendedor
            porVendedor.set(key, existing)
          }
          return {
            items,
            totales: {
              merkao_pendiente: +merkao_pendiente.toFixed(2),
              merkao_liberado: +merkao_liberado.toFixed(2),
              vendedor_pagado: +vendedor_pagado.toFixed(2),
              vendedor_pendiente_pagar: +vendedor_pendiente_pagar.toFixed(2),
            },
            por_vendedor: Array.from(porVendedor.values())
              .map((v) => ({
                ...v,
                pendiente: +v.pendiente.toFixed(2),
                por_pagar: +v.por_pagar.toFixed(2),
                pagado: +v.pagado.toFixed(2),
              }))
              .sort((a, b) => b.por_pagar - a.por_pagar),
          }
        })
        setToast('Marcado como pagado.')
      }
    } catch {
      setToast('Error de red al marcar como pagado.')
    }
    setConfirmPay(null)
    setSubmitting(false)
    setTimeout(() => setToast(''), 3000)
  }

  if (authLoading || (!user && !authLoading)) {
    return <div style={{ padding: 32, fontFamily: 'system-ui' }}>Cargando…</div>
  }

  if (!isAdminEmail(user?.email)) {
    return null
  }

  const items = data?.items ?? []
  const shown = items.filter((i) => (tab === 'pendientes' ? i.estado === 'pendiente' : i.estado === 'liberado'))
  const totalMerkao = (data?.totales.merkao_pendiente ?? 0) + (data?.totales.merkao_liberado ?? 0)
  const showPagoCol = tab === 'liberadas'

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
            <Kpi label="Pendiente de pagar a vendedores" value={money(data.totales.vendedor_pendiente_pagar)} tone="amber" />
            <Kpi label="Total pagado a vendedores" value={money(data.totales.vendedor_pagado)} tone="green" />
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
                    <Th align="right">Pendiente (en escrow)</Th>
                    <Th align="right">Por pagar (liberado)</Th>
                    <Th align="right">Ya pagado</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.por_vendedor.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#52607a' }}>Sin datos todavía.</td></tr>
                  ) : (
                    data.por_vendedor.map((v) => (
                      <tr key={v.vendedor_id || v.vendedor_nombre} style={{ borderTop: '1px solid #eef2f7' }}>
                        <Td>{v.vendedor_nombre}</Td>
                        <Td align="right">{money(v.pendiente)}</Td>
                        <Td align="right" strong={v.por_pagar > 0}>{money(v.por_pagar)}</Td>
                        <Td align="right">{money(v.pagado)}</Td>
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
                    {showPagoCol && <Th align="right">Pago al vendedor</Th>}
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 ? (
                    <tr>
                      <td colSpan={showPagoCol ? 8 : 7} style={{ padding: 16, textAlign: 'center', color: '#52607a' }}>
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
                        {showPagoCol && (
                          <Td align="right">
                            {it.pagado_a_vendedor ? (
                              <span title={it.pagado_at ? `Pagado el ${fmt(it.pagado_at)}` : 'Pagado'} style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 999,
                                background: '#e3f6e8',
                                color: '#1b5e20',
                                fontSize: 12,
                                fontWeight: 600,
                              }}>
                                ✓ Pagado{it.pagado_at ? ' · ' + fmt(it.pagado_at) : ''}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmPay(it)}
                                disabled={submitting}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #1a3a8a',
                                  background: '#1a3a8a',
                                  color: '#fff',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: submitting ? 'not-allowed' : 'pointer',
                                  opacity: submitting ? 0.6 : 1,
                                }}
                              >
                                Marcar como pagado
                              </button>
                            )}
                          </Td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {confirmPay && (
        <div
          onClick={() => !submitting && setConfirmPay(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(11, 18, 32, 0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%',
              padding: '28px 26px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#e3f6e8', color: '#1b5e20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 14px',
            }}>
              ✓
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, textAlign: 'center' }}>
              ¿Confirmas que transferiste{' '}
              <strong>{money(confirmPay.monto_vendedor)}</strong>{' '}
              a <strong>{confirmPay.vendedor_nombre}</strong>?
            </h3>
            <p style={{ margin: '0 0 20px', color: '#52607a', fontSize: 13, textAlign: 'center' }}>
              Esto marca la comisión como pagada al vendedor y queda registrado en el ledger.
              Solo confírmalo si ya hiciste la transferencia.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmPay(null)}
                disabled={submitting}
                style={{
                  padding: '10px 18px', borderRadius: 10,
                  border: '1px solid #d6dde9', background: '#f4f6fb', color: '#0b1220',
                  fontSize: 14, fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => marcarPagado(confirmPay)}
                disabled={submitting}
                style={{
                  padding: '10px 18px', borderRadius: 10,
                  border: 'none', background: '#1b5e20', color: '#fff',
                  fontSize: 14, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Guardando…' : 'Sí, ya pagué'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#0b1220', color: '#fff', padding: '12px 18px',
          borderRadius: 10, fontSize: 14, zIndex: 60, boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
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
