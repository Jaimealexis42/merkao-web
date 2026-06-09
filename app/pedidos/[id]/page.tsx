'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fmt, ARANCELES } from '@/lib/precios'
import { useAuth } from '@/lib/useAuth'
import { Icon, type IconName } from '@/lib/icons'

type EstadoPedido =
  | 'pagado' | 'enviado' | 'entregado' | 'liberado' | 'disputado' | 'cancelado'

type Pedido = {
  id: string
  comprador_id: string | null
  vendedor_id: string | null
  producto_id: string | null
  total: number
  comision: number | null
  estado: EstadoPedido
  direccion_entrega: string | null
  metodo_pago: string | null
  culqi_charge_id: string | null
  created_at: string
  escrow_liberado: boolean | null
  igv: number | null
  arancel: number | null
  pais_comprador: string | null
  nombre_comprador: string | null
  email_comprador: string | null
}

type PedidoItem = {
  id: string
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  imagen_url: string | null
}

type Producto = {
  id: string
  nombre: string
  imagenes: string[] | null
  ciudad: string | null
  vendedor_id: string | null
}

type TrackingEvent = {
  tracking_code: string | null
  estado: string | null
  transportista: string | null
}

const TIMELINE: { key: EstadoPedido; label: string; desc: string; icon: IconName }[] = [
  { key: 'pagado',    label: 'Pago recibido',    desc: 'Tu pago está retenido en Escrow de forma segura.',         icon: 'card' },
  { key: 'enviado',   label: 'Producto enviado', desc: 'El vendedor despachó tu pedido. Va en camino.',            icon: 'truck' },
  { key: 'entregado', label: 'Entregado',        desc: 'El producto fue entregado. Confirma para liberar el pago.', icon: 'home' },
  { key: 'liberado',  label: 'Pago liberado',    desc: 'Confirmaste la recepción. El vendedor ya recibió el pago.', icon: 'wallet' },
]
const TIMELINE_IDX: Record<EstadoPedido, number> = {
  pagado: 0, enviado: 1, entregado: 2, liberado: 3,
  disputado: 2, cancelado: 0,
}

const ESTADO_BADGE: Record<EstadoPedido, { label: string; tone: 'amber' | 'navy' | 'green' | 'red' | 'gray'; icon: IconName }> = {
  pagado:    { label: 'Pago retenido', tone: 'amber', icon: 'lock' },
  enviado:   { label: 'En camino',     tone: 'navy',  icon: 'truck' },
  entregado: { label: 'Por confirmar', tone: 'amber', icon: 'home' },
  liberado:  { label: 'Completado',    tone: 'green', icon: 'checkCircle' },
  disputado: { label: 'En disputa',    tone: 'red',   icon: 'bell' },
  cancelado: { label: 'Cancelado',     tone: 'gray',  icon: 'trash' },
}

function shortId(id: string) {
  return '#MK-' + id.slice(0, 8).toUpperCase()
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [items, setItems] = useState<PedidoItem[]>([])
  const [producto, setProducto] = useState<Producto | null>(null)
  const [tracking, setTracking] = useState<TrackingEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [accion, setAccion] = useState<'confirmar' | 'disputar' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tone: 'green' | 'amber'; text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?redirect=/perfil')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!id || authLoading || !user) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const ped = data as Pedido
      const esOwner =
        (ped.comprador_id && ped.comprador_id === user.id) ||
        (!ped.comprador_id && ped.email_comprador === user.email)
      if (!esOwner) {
        router.replace('/')
        return
      }

      setPedido(ped)

      const [itemsRes, trackingRes] = await Promise.all([
        supabase
          .from('pedido_items')
          .select('id, nombre_producto, cantidad, precio_unitario, imagen_url')
          .eq('pedido_id', id),
        supabase
          .from('order_tracking')
          .select('tracking_code, estado, transportista')
          .eq('pedido_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      if (itemsRes.data && itemsRes.data.length > 0) {
        setItems(itemsRes.data as PedidoItem[])
      } else if (ped.producto_id) {
        const { data: prod } = await supabase
          .from('productos')
          .select('id, nombre, imagenes, ciudad, vendedor_id')
          .eq('id', ped.producto_id)
          .single()
        if (!cancelled && prod) setProducto(prod as Producto)
      }

      setTracking((trackingRes.data as TrackingEvent | null) ?? null)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [id, authLoading, user, router])

  const estadoIdx = useMemo(() => {
    if (!pedido) return 0
    return TIMELINE_IDX[pedido.estado] ?? 0
  }, [pedido])

  const cambiarEstado = async (nuevoEstado: EstadoPedido) => {
    if (!pedido) return
    setProcesando(true)
    const updates: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === 'liberado') updates.escrow_liberado = true

    const { error } = await supabase
      .from('pedidos')
      .update(updates)
      .eq('id', pedido.id)

    if (error) {
      setMensaje({ tone: 'amber', text: 'No se pudo actualizar: ' + error.message })
    } else {
      setPedido({ ...pedido, ...updates } as Pedido)
      if (nuevoEstado === 'liberado')
        setMensaje({ tone: 'green', text: 'Recepción confirmada. El pago fue liberado al vendedor.' })
      if (nuevoEstado === 'disputado')
        setMensaje({ tone: 'amber', text: 'Disputa abierta. Nuestro equipo te contactará en 24-48 h.' })
    }
    setProcesando(false)
    setAccion(null)
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Cargando pedido…</p>
      </div>
    )
  }

  if (notFound || !pedido) {
    return (
      <div className="mk-empty-page">
        <Icon name="box" size={56} stroke={1.4} />
        <h2>Pedido no encontrado</h2>
        <p>El ID no existe o no tienes acceso a este pedido.</p>
        <Link href="/mis-pedidos" className="mk-btn mk-btn-primary" style={{ marginTop: 8 }}>
          Ver mis pedidos
        </Link>
      </div>
    )
  }

  const badge = ESTADO_BADGE[pedido.estado] ?? ESTADO_BADGE.pagado
  const arancelInfo = pedido.pais_comprador ? ARANCELES[pedido.pais_comprador] : null
  const base = +(pedido.total - (pedido.igv ?? 0) - (pedido.arancel ?? 0)).toFixed(2)
  const sellerCiudad = producto?.ciudad ?? null
  const sellerId = producto?.vendedor_id ?? pedido.vendedor_id
  const isCancelOrDispute = pedido.estado === 'cancelado' || pedido.estado === 'disputado'
  const donePctRatio = Math.min(estadoIdx, TIMELINE.length - 1) / (TIMELINE.length - 1)
  // height % between dots. Each row spans ~58px. Easier: compute via line clipping.
  const donePct = isCancelOrDispute ? 0 : donePctRatio * 100

  return (
    <>
      {/* ── Header ── */}
      <header className="mk-chdr">
        <div className="mk-chdr-inner">
          <Link href="/" className="mk-logo">
            merkao<span className="mk-logo-dot">.pe</span>
          </Link>
          <span className="mk-chdr-secure">
            <Icon name="shield" size={15} stroke={1.9} /> Pago Escrow protegido
          </span>
          <Link href="/mis-pedidos" className="mk-chdr-help">
            <Icon name="chevronLeft" size={15} /> Mis pedidos
          </Link>
        </div>
      </header>

      <main className="mk-pdet">
        <nav className="mk-crumb-row" aria-label="Migas">
          <Link href="/">Inicio</Link>
          <Icon name="chevronRight" size={12} stroke={2} />
          <Link href="/mis-pedidos">Mis pedidos</Link>
          <Icon name="chevronRight" size={12} stroke={2} />
          <span className="on">{shortId(pedido.id)}</span>
        </nav>

        {/* Head card */}
        <section className="mk-pdet-head">
          <div className="mk-pdet-head-info">
            <h1>Seguimiento de pedido</h1>
            <span className="mk-pdet-id">
              ID: <code>{shortId(pedido.id)}</code>
            </span>
            <span className="mk-pdet-date">Realizado el {fmtFecha(pedido.created_at)}</span>
          </div>
          <span className={'mk-pdet-badge ' + badge.tone}>
            <Icon name={badge.icon} size={14} stroke={2} /> {badge.label}
          </span>
        </section>

        {mensaje && (
          <div className={'mk-pdet-msg ' + mensaje.tone}>
            <Icon name={mensaje.tone === 'green' ? 'checkCircle' : 'bell'} size={16} stroke={1.9} />
            <span>{mensaje.text}</span>
          </div>
        )}

        {/* Timeline */}
        <section className="mk-pdet-card">
          <div className="mk-pdet-card-h">
            <Icon name="shield" size={16} stroke={2} /> Estado del proceso Escrow
          </div>
          <div className="mk-tline">
            {!isCancelOrDispute && (
              <div className="mk-tline-done-bar" style={{ height: `calc(${donePct}% - ${donePct === 0 ? 0 : 18}px)` }} />
            )}
            {TIMELINE.map((step, i) => {
              const done = !isCancelOrDispute && i < estadoIdx
              const current = !isCancelOrDispute && i === estadoIdx
              const cls = done ? ' done' : current ? ' current' : ''
              return (
                <div key={step.key} className={'mk-tline-row' + cls}>
                  <div className="mk-tline-dot">
                    {done ? (
                      <Icon name="check" size={16} stroke={2.4} />
                    ) : (
                      <Icon name={step.icon} size={16} stroke={1.9} />
                    )}
                  </div>
                  <div className="mk-tline-info">
                    <strong>{step.label}</strong>
                    <small>{step.desc}</small>
                  </div>
                  {current && <span className="mk-tline-tag current">Actual</span>}
                  {done && <span className="mk-tline-tag done">Hecho</span>}
                </div>
              )
            })}
          </div>
        </section>

        {/* Tracking link */}
        {tracking?.tracking_code && (
          <Link href={`/tracking/${tracking.tracking_code}`} className="mk-pdet-tracking-link">
            <Icon name="truck" size={20} stroke={1.9} />
            <div style={{ flex: 1 }}>
              <strong>Tu pedido tiene tracking activo</strong>
              <small>
                {tracking.transportista ? `${tracking.transportista} · ` : ''}
                Código: <strong style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{tracking.tracking_code}</strong>
              </small>
            </div>
            <Icon name="arrowRight" size={16} stroke={2} />
          </Link>
        )}

        {/* Items */}
        <section className="mk-pdet-card">
          <div className="mk-pdet-card-h">
            <Icon name="box" size={16} stroke={2} /> Productos en este pedido
          </div>
          {items.length > 0 ? (
            <div className="mk-pdet-items">
              {items.map((it) => (
                <div key={it.id} className="mk-pdet-item">
                  <div className="mk-pdet-item-thumb">
                    {it.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imagen_url} alt={it.nombre_producto} />
                    ) : (
                      <Icon name="box" size={22} stroke={1.6} />
                    )}
                  </div>
                  <div className="mk-pdet-item-info">
                    <strong>{it.nombre_producto}</strong>
                    <small>Cantidad: {it.cantidad}</small>
                  </div>
                  <div className="mk-pdet-item-price">
                    <strong>{fmt(it.precio_unitario * it.cantidad)}</strong>
                    <small>{fmt(it.precio_unitario)} c/u</small>
                  </div>
                </div>
              ))}
            </div>
          ) : producto ? (
            <div className="mk-pdet-items">
              <div className="mk-pdet-item">
                <div className="mk-pdet-item-thumb">
                  {producto.imagenes?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={producto.imagenes[0]} alt={producto.nombre} />
                  ) : (
                    <Icon name="box" size={22} stroke={1.6} />
                  )}
                </div>
                <div className="mk-pdet-item-info">
                  <strong>{producto.nombre}</strong>
                  {producto.ciudad && <small><Icon name="mapPin" size={11} stroke={2} /> {producto.ciudad}, Perú</small>}
                </div>
                <Link href={`/productos/${producto.id}`} className="mk-btn mk-btn-ghost" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                  Ver producto <Icon name="arrowRight" size={13} />
                </Link>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              Sin detalle de productos disponible para este pedido.
            </p>
          )}
        </section>

        {/* Vendedor */}
        {(sellerId || sellerCiudad) && (
          <section className="mk-pdet-card">
            <div className="mk-pdet-card-h">
              <Icon name="store" size={16} stroke={2} /> Vendedor
            </div>
            <div className="mk-pdet-item" style={{ background: 'var(--bg)' }}>
              <div
                className="mk-pdet-item-thumb"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-700))', color: '#fff', border: 'none' }}
              >
                <Icon name="store" size={22} stroke={1.7} />
              </div>
              <div className="mk-pdet-item-info">
                <strong>Tienda Merkao</strong>
                <small>
                  {sellerCiudad ? (
                    <><Icon name="mapPin" size={11} stroke={2} /> {sellerCiudad}, Perú · </>
                  ) : null}
                  Pago Escrow activo
                </small>
              </div>
              {sellerId && (
                <Link href={`/tienda/${sellerId}`} className="mk-btn mk-btn-ghost" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                  Ver tienda <Icon name="arrowRight" size={13} />
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Acciones (solo cuando entregado) */}
        {pedido.estado === 'entregado' && (
          <section className="mk-pdet-card">
            <div className="mk-pdet-card-h">
              <Icon name="checkCircle" size={16} stroke={2} /> ¿Ya recibiste tu pedido?
            </div>
            {accion === null ? (
              <>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.55 }}>
                  Confirma la recepción para liberar el pago al vendedor, o abre una disputa
                  si hay algún problema con tu pedido.
                </p>
                <div className="mk-pdet-actions">
                  <button
                    type="button"
                    onClick={() => setAccion('confirmar')}
                    className="mk-btn mk-btn-primary"
                  >
                    <Icon name="check" size={16} stroke={2.2} /> Confirmar entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccion('disputar')}
                    className="mk-btn mk-btn-warn"
                  >
                    <Icon name="bell" size={16} stroke={2} /> Abrir disputa
                  </button>
                </div>
              </>
            ) : (
              <div className="mk-pdet-confirm">
                <p>
                  {accion === 'confirmar'
                    ? <>¿Confirmas que recibiste el producto en buen estado? Liberaremos <strong>{fmt(pedido.total)}</strong> al vendedor.</>
                    : <>¿Quieres abrir una disputa? Nuestro equipo de soporte revisará el caso y te contactará en 24-48 h.</>}
                </p>
                <div className="mk-pdet-confirm-actions">
                  <button
                    type="button"
                    onClick={() => setAccion(null)}
                    disabled={procesando}
                    className="mk-btn mk-btn-ghost"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarEstado(accion === 'confirmar' ? 'liberado' : 'disputado')}
                    disabled={procesando}
                    className={'mk-btn ' + (accion === 'confirmar' ? 'mk-btn-primary' : 'mk-btn-warn')}
                  >
                    <Icon name={accion === 'confirmar' ? 'check' : 'bell'} size={16} stroke={2} />
                    {procesando
                      ? 'Procesando…'
                      : accion === 'confirmar' ? 'Sí, liberar pago' : 'Sí, abrir disputa'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Resumen del pago */}
        <section className="mk-pdet-card">
          <div className="mk-pdet-card-h">
            <Icon name="wallet" size={16} stroke={2} /> Resumen del pago
          </div>
          <div className="mk-prof-rows">
            <div className="mk-prof-row">
              <span>Precio base</span>
              <span>{fmt(base)}</span>
            </div>
            <div className="mk-prof-row">
              <span>IGV 18%</span>
              <span>{fmt(pedido.igv ?? 0)}</span>
            </div>
            {(pedido.arancel ?? 0) > 0 && arancelInfo && (
              <div className="mk-prof-row">
                <span>Arancel {arancelInfo.bandera} {Math.round(arancelInfo.tasa * 100)}%</span>
                <span className="amber">+{fmt(pedido.arancel ?? 0)}</span>
              </div>
            )}
            <div className="mk-prof-row">
              <span>Total pagado</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{fmt(pedido.total)}</span>
            </div>
            <div className="mk-prof-row">
              <span>Método de pago</span>
              <span style={{ textTransform: 'capitalize' }}>{pedido.metodo_pago ?? '—'}</span>
            </div>
            <div className="mk-prof-row">
              <span>Estado del Escrow</span>
              {pedido.escrow_liberado ? (
                <span className="green">✓ Liberado al vendedor</span>
              ) : (
                <span className="amber">🔒 En custodia</span>
              )}
            </div>
            {pedido.culqi_charge_id && (
              <div className="mk-prof-row">
                <span>Charge Culqi</span>
                <span><code>{pedido.culqi_charge_id.slice(0, 14)}…</code></span>
              </div>
            )}
          </div>
        </section>

        {/* Datos de entrega */}
        <section className="mk-pdet-card">
          <div className="mk-pdet-card-h">
            <Icon name="mapPin" size={16} stroke={2} /> Datos de entrega
          </div>
          <div className="mk-prof-rows">
            <div className="mk-prof-row">
              <span>Comprador</span>
              <span>{pedido.nombre_comprador ?? '—'}</span>
            </div>
            <div className="mk-prof-row">
              <span>Correo</span>
              <span>{pedido.email_comprador ?? '—'}</span>
            </div>
            <div className="mk-prof-row">
              <span>Dirección</span>
              <span>{pedido.direccion_entrega ?? '—'}</span>
            </div>
            {pedido.pais_comprador && (
              <div className="mk-prof-row">
                <span>País</span>
                <span>
                  {arancelInfo ? `${arancelInfo.bandera} ${arancelInfo.pais}` : '🇵🇪 Perú'}
                </span>
              </div>
            )}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          <Link href="/mis-pedidos" className="mk-btn mk-btn-ghost">
            <Icon name="chevronLeft" size={14} stroke={2} /> Volver a mis pedidos
          </Link>
          <Link href="/" className="mk-btn mk-btn-primary">
            Seguir comprando <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </main>
    </>
  )
}
