'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { isAdminEmail } from '@/lib/admin'

type PedidoLiberacion = {
  id: string
  nombre_comprador: string
  email_comprador: string
  total: number
  estado: string
  entregado_at: string | null
  created_at: string
  vendedor_nombre: string | null
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function diasRestantes(entregadoAt: string): number {
  const libera = new Date(addDays(entregadoAt, 7))
  return Math.ceil((libera.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2 })
}

export default function LiberacionesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<PedidoLiberacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || !isAdminEmail(user.email ?? ''))) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (authLoading || !user || !isAdminEmail(user.email ?? '')) return
    ;(async () => {
      // Pedidos en estado entregado (esperando confirmación o auto-liberación)
      // y disputados (problema reportado, requieren atención)
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, nombre_comprador, email_comprador, total, estado, entregado_at, created_at, vendedor_id')
        .in('estado', ['entregado', 'disputado'])
        .order('entregado_at', { ascending: true, nullsFirst: true })

      if (error) { console.error(error); setLoading(false); return }

      const rows = data ?? []
      const vids = [...new Set(rows.map(r => r.vendedor_id).filter(Boolean))]

      let tiendaMap: Map<string, string> = new Map()
      if (vids.length > 0) {
        const { data: tiendas } = await supabase
          .from('tiendas')
          .select('id, nombre')
          .in('id', vids)
        tiendaMap = new Map((tiendas ?? []).map(t => [t.id as string, t.nombre as string]))
      }

      setItems(rows.map(r => ({
        ...r,
        vendedor_nombre: tiendaMap.get(r.vendedor_id) ?? null,
      })) as PedidoLiberacion[])
      setLoading(false)
    })()
  }, [authLoading, user])

  if (authLoading || loading) {
    return <div style={{ padding: 40, color: 'var(--muted)' }}>Cargando…</div>
  }

  const entregados = items.filter(i => i.estado === 'entregado')
  const disputados = items.filter(i => i.estado === 'disputado')

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Pedidos por liberar</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>
        Pedidos entregados esperando confirmación (auto-liberación a los 7 días) y disputas abiertas.
      </p>

      {disputados.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>
            ⚠️ Disputas abiertas ({disputados.length})
          </h2>
          <Table rows={disputados} showDisputa />
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
          Esperando confirmación ({entregados.length})
        </h2>
        {entregados.length === 0
          ? <p style={{ fontSize: 14, color: 'var(--muted)' }}>Ninguno por ahora.</p>
          : <Table rows={entregados} />
        }
      </section>
    </div>
  )
}

function Table({ rows, showDisputa = false }: { rows: PedidoLiberacion[]; showDisputa?: boolean }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Pedido</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Comprador</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Tienda</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Total</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Entregado</th>
            {!showDisputa && <th style={{ padding: '8px 12px', fontWeight: 600 }}>Se libera</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const dias = r.entregado_at ? diasRestantes(r.entregado_at) : null
            const liberaEn = r.entregado_at ? fmt(addDays(r.entregado_at, 7)) : '—'
            const urgente = dias !== null && dias <= 1
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>
                  {r.id.slice(0, 8)}…
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{r.nombre_comprador || '—'}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>{r.email_comprador}</div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                  {r.vendedor_nombre ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                  {money(r.total)}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                  {r.entregado_at ? fmt(r.entregado_at) : '—'}
                </td>
                {!showDisputa && (
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: urgente ? '#dc2626' : 'var(--ink)', fontWeight: urgente ? 700 : 400 }}>
                      {dias === null ? '—'
                        : dias <= 0 ? 'Hoy (en cola)'
                        : `${liberaEn} (${dias}d)`}
                    </span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
