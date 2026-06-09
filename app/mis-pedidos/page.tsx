'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { Icon, type IconName } from '@/lib/icons'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'

type EstadoPedido =
  | 'pagado'
  | 'enviado'
  | 'entregado'
  | 'liberado'
  | 'disputado'
  | 'cancelado'

type Pedido = {
  id: string
  comprador_id: string | null
  vendedor_id: string | null
  total: number
  estado: EstadoPedido
  created_at: string
  email_comprador: string | null
  direccion_entrega: string | null
  producto_id: string | null
}

type PedidoItem = {
  pedido_id: string
  nombre_producto: string
  imagen_url: string | null
}

type Tienda = {
  vendedor_id: string
  nombre: string | null
  ciudad: string | null
}

type Row = {
  pedido: Pedido
  prodNombre: string
  prodImg: string | null
  sellerName: string
  sellerCiudad: string
  stage: 0 | 1 | 2 | 3
}

const STAGE_BY_ESTADO: Record<EstadoPedido, 0 | 1 | 2 | 3> = {
  pagado: 0,
  enviado: 1,
  entregado: 2,
  liberado: 3,
  disputado: 2,
  cancelado: 0,
}

const STAGE_LABELS = ['Pagado', 'Enviado', 'Recibido', 'Liberado'] as const
const STAGE_ICONS: IconName[] = ['card', 'box', 'home', 'wallet']

const STAGE_BADGE: { tone: 'amber' | 'navy' | 'green'; label: string }[] = [
  { tone: 'amber', label: 'Pago retenido' },
  { tone: 'navy', label: 'En camino' },
  { tone: 'amber', label: 'Por confirmar' },
  { tone: 'green', label: 'Completado' },
]

function money(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function shortId(id: string) {
  return '#MK-' + id.slice(0, 8).toUpperCase()
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function Tracker({ stage }: { stage: 0 | 1 | 2 | 3 }) {
  return (
    <div className="mp-track">
      {STAGE_LABELS.map((label, i) => {
        const cls = i < stage ? 'done' : i === stage ? 'current' : ''
        return (
          <Fragment key={label}>
            <div className={'mp-step ' + cls}>
              <span className="mp-dot">
                {i < stage ? (
                  <Icon name="check" size={13} stroke={3} />
                ) : (
                  <Icon name={STAGE_ICONS[i]} size={14} stroke={2} />
                )}
              </span>
              <span>{label}</span>
            </div>
            {i < STAGE_LABELS.length - 1 && (
              <div className={'mp-conn' + (i < stage ? ' done' : '')} />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

type Tab = 'todos' | 'activos' | 'recibir' | 'completados'

export default function MisPedidosPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('todos')
  const [confirm, setConfirm] = useState<Row | null>(null)
  const [toast, setToast] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?redirect=/mis-pedidos')
  }, [authLoading, user, router])

  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false

    ;(async () => {
      setLoading(true)

      // Filtro: pedidos del usuario por id, o por email (guest-checkout convertido).
      // Email se sanea para no romper el operador .or() de Supabase (separa con comas).
      const safeEmail = (user.email ?? '').replace(/[(),]/g, '')
      const orFilter = safeEmail
        ? `comprador_id.eq.${user.id},email_comprador.eq.${safeEmail}`
        : `comprador_id.eq.${user.id}`

      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(
          'id, comprador_id, vendedor_id, total, estado, created_at, email_comprador, direccion_entrega, producto_id',
        )
        .or(orFilter)
        .order('created_at', { ascending: false })

      if (error || !pedidos || pedidos.length === 0) {
        if (!cancelled) {
          setRows([])
          setLoading(false)
        }
        return
      }

      const pedidoIds = pedidos.map((p) => p.id)
      const vendedorIds = Array.from(
        new Set(pedidos.map((p) => p.vendedor_id).filter((v): v is string => !!v)),
      )

      const [itemsRes, tiendasRes] = await Promise.all([
        supabase
          .from('pedido_items')
          .select('pedido_id, nombre_producto, imagen_url')
          .in('pedido_id', pedidoIds),
        vendedorIds.length > 0
          ? supabase
              .from('tiendas')
              .select('vendedor_id, nombre, ciudad')
              .in('vendedor_id', vendedorIds)
          : Promise.resolve({ data: [] as Tienda[] }),
      ])

      const itemsByPedido = new Map<string, PedidoItem>()
      ;(itemsRes.data as PedidoItem[] | null)?.forEach((it) => {
        if (!itemsByPedido.has(it.pedido_id)) itemsByPedido.set(it.pedido_id, it)
      })

      const tiendaByVendedor = new Map<string, Tienda>()
      ;(tiendasRes.data as Tienda[] | null)?.forEach((t) =>
        tiendaByVendedor.set(t.vendedor_id, t),
      )

      const built: Row[] = (pedidos as Pedido[]).map((p) => {
        const it = itemsByPedido.get(p.id)
        const tienda = p.vendedor_id ? tiendaByVendedor.get(p.vendedor_id) : null
        return {
          pedido: p,
          prodNombre: it?.nombre_producto ?? 'Producto',
          prodImg: it?.imagen_url ?? null,
          sellerName: tienda?.nombre ?? 'Vendedor Merkao',
          sellerCiudad: tienda?.ciudad ?? 'Perú',
          stage: STAGE_BY_ESTADO[p.estado] ?? 0,
        }
      })

      if (!cancelled) {
        setRows(built)
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  const counts = useMemo(() => {
    return {
      todos: rows.length,
      activos: rows.filter((r) => r.stage < 3).length,
      recibir: rows.filter((r) => r.stage === 2).length,
      completados: rows.filter((r) => r.stage === 3).length,
    }
  }, [rows])

  const shown = useMemo(() => {
    return rows.filter((r) => {
      if (tab === 'todos') return true
      if (tab === 'activos') return r.stage < 3
      if (tab === 'recibir') return r.stage === 2
      return r.stage === 3
    })
  }, [rows, tab])

  const liberar = async (row: Row) => {
    if (submitting) return
    setSubmitting(true)
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'liberado', escrow_liberado: true })
      .eq('id', row.pedido.id)

    if (error) {
      setToast('No se pudo liberar el pago. Intenta de nuevo.')
    } else {
      setRows((rs) =>
        rs.map((r) =>
          r.pedido.id === row.pedido.id
            ? { ...r, stage: 3, pedido: { ...r.pedido, estado: 'liberado' } }
            : r,
        ),
      )
      setToast('¡Pago liberado! Gracias por tu compra.')
    }
    setConfirm(null)
    setSubmitting(false)
    setTimeout(() => setToast(''), 2800)
  }

  const TABS: { id: Tab; label: string; n: number }[] = [
    { id: 'todos', label: 'Todos', n: counts.todos },
    { id: 'activos', label: 'En proceso', n: counts.activos },
    { id: 'recibir', label: 'Por confirmar', n: counts.recibir },
    { id: 'completados', label: 'Completados', n: counts.completados },
  ]

  return (
    <>
      <SiteTopnav active="mis-pedidos" showTrust />

      <div className="mp">
        <div className="mp-head">
          <h1>Mis pedidos</h1>
          <p>
            Sigue tus compras y confirma la entrega para liberar el Pago Escrow al vendedor.
          </p>
        </div>

        <div className="mp-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={'mp-tab' + (tab === t.id ? ' on' : '')}
              onClick={() => setTab(t.id)}
            >
              {t.label} <span className="mp-tab-n">{t.n}</span>
            </button>
          ))}
        </div>

        {authLoading || loading ? (
          <div className="mp-empty">
            <p>Cargando tus pedidos…</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="mp-empty">
            <h3>{rows.length === 0 ? 'Aún no tienes pedidos' : 'Sin pedidos en esta categoría'}</h3>
            <p>
              {rows.length === 0
                ? 'Cuando compres en Merkao, verás aquí el estado de cada pedido y su Pago Escrow.'
                : 'Cambia de pestaña para ver tus otros pedidos.'}
            </p>
            {rows.length === 0 && (
              <Link className="mk-btn mk-btn-primary" href="/">
                Explorar el marketplace
              </Link>
            )}
          </div>
        ) : (
          <div className="mp-list">
            {shown.map((row) => {
              const badge = STAGE_BADGE[row.stage]
              const canConfirm = row.stage === 2
              return (
                <article className="mp-card" key={row.pedido.id}>
                  <div className="mp-card-top">
                    <span className="mp-id">{shortId(row.pedido.id)}</span>
                    <span className="mp-date">{fmtFecha(row.pedido.created_at)}</span>
                    <span className={'mp-badge ' + badge.tone}>
                      {row.stage === 3 ? (
                        <Icon name="checkCircle" size={13} stroke={2} />
                      ) : (
                        <Icon name="lock" size={12} stroke={2} />
                      )}{' '}
                      {badge.label}
                    </span>
                  </div>

                  <div className="mp-body">
                    <div className="mp-thumb">
                      {row.prodImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.prodImg} alt={row.prodNombre} />
                      ) : (
                        <span className="mp-thumb-ph">Foto</span>
                      )}
                    </div>
                    <div className="mp-info">
                      <div className="mp-prod">{row.prodNombre}</div>
                      <div className="mp-seller">
                        <Icon name="store" size={13} stroke={1.9} /> {row.sellerName} ·{' '}
                        <Icon name="mapPin" size={12} stroke={2} /> {row.sellerCiudad}
                      </div>
                    </div>
                    <div className="mp-price">S/ {money(row.pedido.total)}</div>
                  </div>

                  <Tracker stage={row.stage} />

                  <div className="mp-foot">
                    <div className={'mp-foot-note' + (row.stage === 3 ? ' green' : '')}>
                      {row.stage === 0 && (
                        <>
                          <Icon name="lock" size={15} stroke={1.9} /> Tu pago está retenido y
                          protegido. El vendedor prepara tu envío.
                        </>
                      )}
                      {row.stage === 1 && (
                        <>
                          <Icon name="truck" size={15} stroke={1.9} /> Tu pedido va en camino.
                          Confirma cuando lo recibas.
                        </>
                      )}
                      {row.stage === 2 && (
                        <>
                          <Icon name="checkCircle" size={15} stroke={1.9} /> ¿Ya recibiste tu
                          pedido? Confírmalo para liberar el pago.
                        </>
                      )}
                      {row.stage === 3 && (
                        <>
                          <Icon name="checkCircle" size={15} stroke={1.9} /> Pedido completado.
                          Pago liberado al vendedor.
                        </>
                      )}
                    </div>
                    <div className="mp-actions">
                      <Link className="mp-link" href={`/pedidos/${row.pedido.id}`}>
                        <Icon name="eye" size={14} stroke={1.9} /> Ver detalle
                      </Link>
                      {canConfirm ? (
                        <button
                          type="button"
                          className="mk-btn mk-btn-primary"
                          onClick={() => setConfirm(row)}
                        >
                          <Icon name="check" size={16} stroke={2} /> Confirmar entrega
                        </button>
                      ) : row.stage === 3 ? (
                        <Link className="mp-link" href={`/pedidos/${row.pedido.id}`}>
                          <Icon name="star" size={14} stroke={1.9} /> Dejar reseña
                        </Link>
                      ) : (
                        <Link className="mp-link" href={`/pedidos/${row.pedido.id}`}>
                          <Icon name="message" size={14} stroke={1.9} /> Contactar vendedor
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {confirm && (
        <div className="mp-modal-bg" onClick={() => !submitting && setConfirm(null)}>
          <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-ico">
              <Icon name="shield" size={34} stroke={1.8} />
            </div>
            <h3>¿Confirmas que recibiste tu pedido?</h3>
            <p>
              Al confirmar, liberamos <strong>S/ {money(confirm.pedido.total)}</strong> al
              vendedor «{confirm.sellerName}». Hazlo solo si recibiste tu producto en buen
              estado.
            </p>
            <div className="mp-modal-actions">
              <button
                type="button"
                className="mk-btn mk-btn-ghost"
                onClick={() => setConfirm(null)}
                disabled={submitting}
              >
                Aún no
              </button>
              <button
                type="button"
                className="mk-btn mk-btn-primary"
                onClick={() => liberar(confirm)}
                disabled={submitting}
              >
                <Icon name="check" size={16} stroke={2} />{' '}
                {submitting ? 'Liberando…' : 'Sí, liberar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="mp-toast">
          <Icon name="checkCircle" size={18} stroke={2} /> {toast}
        </div>
      )}

      <SiteFootnav />
    </>
  )
}
