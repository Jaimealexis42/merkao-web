'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { fmt } from '@/lib/precios'
import { Icon } from '@/lib/icons'

type FiltroEstado = 'todos' | 'pendiente' | 'enviado' | 'entregado'

interface Pedido {
  id: string
  nombre_comprador: string | null
  comprador_id: string | null
  total: number | null
  estado: string | null
  created_at: string
  productoLabel: string
  totalItems: number
}

const ESTADO_BADGE: Record<string, { label: string; tone: 'green' | 'amber' | 'navy' | 'gray' | 'red' }> = {
  pendiente:  { label: 'Pendiente',  tone: 'amber' },
  pagado:     { label: 'Pago recibido', tone: 'amber' },
  preparando: { label: 'Preparando', tone: 'amber' },
  enviado:    { label: 'Enviado',    tone: 'navy' },
  en_camino:  { label: 'En camino',  tone: 'navy' },
  entregado:  { label: 'Entregado',  tone: 'green' },
  liberado:   { label: 'Liberado',   tone: 'green' },
  cancelado:  { label: 'Cancelado',  tone: 'red' },
}

const FILTROS: { id: FiltroEstado; label: string }[] = [
  { id: 'todos',     label: 'Todos' },
  { id: 'pendiente', label: 'Por enviar' },
  { id: 'enviado',   label: 'En camino' },
  { id: 'entregado', label: 'Entregados' },
]

export default function VendedorPedidosPage() {
  const { user, loading: authLoading } = useAuth()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')

  useEffect(() => {
    if (authLoading || !user) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: pedidosData, error: ePed } = await supabase
        .from('pedidos')
        .select('id, comprador_id, nombre_comprador, total, estado, created_at')
        .eq('vendedor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (cancel) return
      if (ePed) {
        setError(ePed.message)
        setLoading(false)
        return
      }

      if (!pedidosData || pedidosData.length === 0) {
        setPedidos([])
        setLoading(false)
        return
      }

      // Batch-fetch de items por pedido_id IN (...). pedido_items tiene
      // snapshot del producto (nombre_producto, cantidad, precio_unitario).
      const pedidoIds = pedidosData.map((p) => p.id)
      const itemsPorPedido = new Map<string, { nombre_producto: string; cantidad: number }[]>()
      const { data: items, error: eItems } = await supabase
        .from('pedido_items')
        .select('pedido_id, nombre_producto, cantidad')
        .in('pedido_id', pedidoIds)
      if (cancel) return
      if (eItems) {
        console.warn('[pedidos] no se pudieron cargar items:', eItems.message)
      } else {
        for (const it of items ?? []) {
          const list = itemsPorPedido.get(it.pedido_id) ?? []
          list.push({ nombre_producto: it.nombre_producto, cantidad: it.cantidad })
          itemsPorPedido.set(it.pedido_id, list)
        }
      }

      const merged: Pedido[] = pedidosData.map((p) => {
        const its = itemsPorPedido.get(p.id) ?? []
        const totalItems = its.reduce((s, i) => s + (i.cantidad ?? 0), 0)
        let productoLabel = '—'
        if (its.length === 1) productoLabel = its[0].nombre_producto
        else if (its.length > 1) productoLabel = `${its[0].nombre_producto} y ${its.length - 1} más`
        return {
          id: p.id,
          nombre_comprador: p.nombre_comprador,
          comprador_id: p.comprador_id,
          total: p.total,
          estado: p.estado,
          created_at: p.created_at,
          productoLabel,
          totalItems,
        }
      })
      setPedidos(merged)
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [authLoading, user])

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return pedidos
    const sinonimos: Record<FiltroEstado, string[]> = {
      todos:     [],
      pendiente: ['pendiente', 'pagado', 'preparando'],
      enviado:   ['enviado', 'en_camino'],
      entregado: ['entregado', 'liberado'],
    }
    const matchAny = sinonimos[filtro]
    return pedidos.filter((p) => matchAny.includes((p.estado ?? '').toLowerCase()))
  }, [pedidos, filtro])

  const conteo = useMemo(() => {
    const c: Record<FiltroEstado, number> = { todos: pedidos.length, pendiente: 0, enviado: 0, entregado: 0 }
    for (const p of pedidos) {
      const est = (p.estado ?? '').toLowerCase()
      if (['pendiente', 'pagado', 'preparando'].includes(est)) c.pendiente++
      else if (['enviado', 'en_camino'].includes(est)) c.enviado++
      else if (['entregado', 'liberado'].includes(est)) c.entregado++
    }
    return c
  }, [pedidos])

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <h1>Pedidos</h1>
          <p>Gestiona envíos y el Pago Escrow de cada pedido.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mk-cat-tabs">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={'mk-cat-tab' + (filtro === f.id ? ' on' : '')}
          >
            {f.label} <span className="mk-cat-tab-n">{conteo[f.id]}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mk-vempty" style={{ color: '#B91C1C', background: '#FEF2F2', borderColor: '#FECACA' }}>
          <Icon name="lock" size={24} />
          <p>No se pudieron cargar los pedidos: {error}</p>
        </div>
      )}

      {loading && (
        <div className="mk-vempty">
          <p style={{ color: 'var(--muted-2)' }}>Cargando pedidos…</p>
        </div>
      )}

      {!loading && !error && filtrados.length === 0 && (
        <div className="mk-vempty">
          <Icon name="truck" size={36} stroke={1.5} />
          <p>
            {filtro === 'todos'
              ? 'Todavía no tienes pedidos. Cuando un comprador pague, aparecerá acá.'
              : 'No hay pedidos en esta categoría.'}
          </p>
        </div>
      )}

      {!loading && !error && filtrados.length > 0 && (
        <div className="mk-vpanel" style={{ padding: 0 }}>
          <div className="mk-vtable-wrap">
            <table className="mk-vtable">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Producto</th>
                  <th>Comprador</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => {
                  const fecha = new Date(p.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
                  const badge = ESTADO_BADGE[(p.estado ?? '').toLowerCase()] ?? { label: p.estado ?? '—', tone: 'gray' as const }
                  return (
                    <tr key={p.id}>
                      <td><span className="mk-vorder-id">#{p.id.slice(0, 8)}</span></td>
                      <td className="mk-vorder-prod">
                        {p.productoLabel === '—'
                          ? <span style={{ color: 'var(--muted-2)', fontStyle: 'italic' }}>sin items</span>
                          : p.productoLabel}
                        {p.totalItems > 1 && (
                          <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{p.totalItems} unidades</div>
                        )}
                      </td>
                      <td>
                        {p.nombre_comprador?.trim()
                          ? <span style={{ fontWeight: 600 }}>{p.nombre_comprador}</span>
                          : p.comprador_id
                            ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>#{p.comprador_id.slice(0, 8)}</span>
                            : <span style={{ color: 'var(--muted-2)' }}>—</span>}
                      </td>
                      <td><strong>{p.total != null ? fmt(p.total) : '—'}</strong></td>
                      <td><span className={'mk-vbadge ' + badge.tone}>{badge.label}</span></td>
                      <td className="mk-vorder-date">{fecha}</td>
                      <td>
                        <a href={`/vendedor/tracking/${p.id}`} className="mk-btn mk-btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}>
                          <Icon name="truck" size={13} /> Tracking
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
