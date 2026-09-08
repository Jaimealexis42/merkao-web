'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { fmt } from '@/lib/precios'
import { Icon, type IconName } from '@/lib/icons'

type Stat = {
  label: string
  value: string
  sub: string
  icon: IconName
  tone: 'brand' | 'amber' | 'navy' | 'green'
}

type PedidoMini = {
  id: string
  nombre_comprador: string
  total: number
  estado: string
  created_at: string
}

const ESTADO_BADGE: Record<string, { label: string; tone: 'green' | 'amber' | 'navy' | 'gray' }> = {
  pagado:    { label: 'Pago recibido', tone: 'amber' },
  enviado:   { label: 'En camino',     tone: 'navy' },
  entregado: { label: 'Entregado',     tone: 'green' },
  liberado:  { label: 'Liberado',      tone: 'green' },
  cancelado: { label: 'Cancelado',     tone: 'gray' },
}

export default function VendedorDashboard() {
  const { user } = useAuth()
  const [stats, setStats]         = useState<Stat[]>([])
  const [pedidosRec, setPedidos]  = useState<PedidoMini[]>([])
  const [loading, setLoading]     = useState(true)
  const [tieneTienda, setTieneTienda]     = useState(true)  // optimista — oculta el aviso hasta confirmar
  const [nombreTienda, setNombreTienda]   = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancel = false

    const cargar = async () => {
      const [productosRes, pedidosRes, tiendaRes] = await Promise.all([
        supabase
          .from('productos')
          .select('id, stock, estado')
          .eq('vendedor_id', user.id),
        supabase
          .from('pedidos')
          .select('id, nombre_comprador, total, estado, created_at')
          .eq('vendedor_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('tiendas')
          .select('id, nombre')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      if (cancel) return

      setTieneTienda(!!tiendaRes.data)
      setNombreTienda(tiendaRes.data?.nombre ?? null)

      const productos = productosRes.data ?? []
      const pedidos   = pedidosRes.data ?? []

      const activos       = productos.filter((p) => p.estado === 'activo').length
      const sinStock      = productos.filter((p) => p.stock === 0).length
      const porEnviar     = pedidos.filter((p) => p.estado === 'pagado').length
      const completados   = pedidos.filter((p) => p.estado === 'entregado' || p.estado === 'liberado')
      const ingresos      = completados.reduce((a, p) => a + (Number(p.total) || 0), 0)
      const enEscrow      = pedidos
        .filter((p) => ['pagado', 'enviado', 'entregado'].includes(p.estado))
        .reduce((a, p) => a + (Number(p.total) || 0), 0)

      setStats([
        {
          label: 'Ingresos completados',
          value: fmt(ingresos),
          sub: `${completados.length} venta${completados.length !== 1 ? 's' : ''}`,
          icon: 'trending',
          tone: 'brand',
        },
        {
          label: 'Pedidos por enviar',
          value: String(porEnviar),
          sub: porEnviar === 0 ? 'todo al día' : 'requieren acción',
          icon: 'clock',
          tone: 'amber',
        },
        {
          label: 'Productos activos',
          value: String(activos),
          sub: sinStock > 0 ? `${sinStock} sin stock` : `de ${productos.length} publicados`,
          icon: 'box',
          tone: 'navy',
        },
        {
          label: 'Saldo en Escrow',
          value: fmt(enEscrow),
          sub: 'protegido hasta entrega',
          icon: 'shield',
          tone: 'green',
        },
      ])

      setPedidos(pedidos.slice(0, 6) as PedidoMini[])
      setLoading(false)
    }

    cargar()
    return () => { cancel = true }
  }, [user])

  const nombre = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'vendedor'

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <h1>Hola, {nombre}</h1>
          <p>Aquí tienes el resumen de tu tienda en Merkao.</p>
        </div>
        <a href="/vendedor/publicar" className="mk-btn mk-btn-primary">
          <Icon name="plus" size={17} /> Publicar producto
        </a>
      </div>

      {/* Aviso: sin tienda registrada (vendedores legacy o edge cases) */}
      {!loading && !tieneTienda && (
        <div className="mk-vpanel" style={{ background: '#FEF9EC', borderColor: '#F59E0B' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Icon name="store" size={22} stroke={1.8} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: '#92400E', margin: '0 0 4px' }}>
                Todavía no tienes un perfil de tienda
              </p>
              <p style={{ fontSize: 13, color: '#92400E', margin: '0 0 10px' }}>
                Los compradores no pueden ver quién eres. Crea tu tienda para que tu nombre aparezca en tus productos y generes más confianza.
              </p>
              <a href="/vendedor/mi-tienda" className="mk-btn mk-btn-primary" style={{ fontSize: 13 }}>
                Crear mi tienda →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Aviso: tienda con nombre por defecto — invitar a personalizar */}
      {!loading && tieneTienda && nombreTienda?.startsWith('Tienda de ') && (
        <div className="mk-vpanel" style={{ background: '#EFF6FF', borderColor: '#93C5FD' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Icon name="store" size={22} stroke={1.8} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: '#1E3A8A', margin: '0 0 4px' }}>
                Personaliza el nombre de tu tienda
              </p>
              <p style={{ fontSize: 13, color: '#1E40AF', margin: '0 0 10px' }}>
                Tu tienda se creó con el nombre <strong>{nombreTienda}</strong>. Ponle un nombre propio para que los compradores te recuerden.
              </p>
              <a href="/vendedor/mi-tienda" className="mk-btn mk-btn-ghost" style={{ fontSize: 13 }}>
                Personalizar mi tienda →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="mk-vstats">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mk-vstat" style={{ minHeight: 130 }}>
                <div className="mk-vstat-top">
                  <span className="mk-vstat-label" style={{ background: 'var(--line-2)', width: 80, height: 14, borderRadius: 4, color: 'transparent' }}>—</span>
                </div>
                <div className="mk-vstat-value" style={{ color: 'var(--line)' }}>—</div>
              </div>
            ))
          : stats.map((s) => (
              <div key={s.label} className="mk-vstat">
                <div className="mk-vstat-top">
                  <span className="mk-vstat-label">{s.label}</span>
                  <span className={'mk-vstat-ico ' + s.tone}>
                    <Icon name={s.icon} size={18} stroke={1.9} />
                  </span>
                </div>
                <div className="mk-vstat-value">{s.value}</div>
                <div className="mk-vstat-foot">
                  <span className="mk-vstat-sub">{s.sub}</span>
                </div>
              </div>
            ))}
      </div>

      {/* Quick actions */}
      <div className="mk-vactions">
        <a href="/vendedor/publicar" className="mk-vaction primary">
          <span className="mk-vaction-ico"><Icon name="plus" size={20} stroke={1.9} /></span>
          <span className="mk-vaction-txt">
            <strong>Publicar producto</strong>
            <small>Agrega un nuevo artículo</small>
          </span>
        </a>
        <a href="/vendedor/pedidos" className="mk-vaction">
          <span className="mk-vaction-ico"><Icon name="truck" size={20} stroke={1.9} /></span>
          <span className="mk-vaction-txt">
            <strong>Ver pedidos</strong>
            <small>Gestiona los envíos</small>
          </span>
        </a>
        <a href="/vendedor/datos-pago" className="mk-vaction">
          <span className="mk-vaction-ico"><Icon name="wallet" size={20} stroke={1.9} /></span>
          <span className="mk-vaction-txt">
            <strong>Datos de pago</strong>
            <small>Cuenta para retiros</small>
          </span>
        </a>
        <a href="/vendedor/mi-tienda" className="mk-vaction">
          <span className="mk-vaction-ico"><Icon name="store" size={20} stroke={1.9} /></span>
          <span className="mk-vaction-txt">
            <strong>Mi tienda</strong>
            <small>Perfil público</small>
          </span>
        </a>
      </div>

      {/* Promo 12 meses gratis */}
      <div className="mk-vpanel" style={{ background: 'linear-gradient(135deg, var(--green) 0%, #0E5F3A 100%)', color: '#fff', borderColor: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Icon name="checkCircle" size={32} stroke={1.7} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>Sin comisiones — recibes el 100% de tu precio</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', margin: '4px 0 0' }}>
              Merkao cobra una tarifa de servicio del 3% al comprador. El precio que publicas es exactamente lo que ingresas por venta.
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '5px 11px' }}>
12 MESES GRATIS
          </span>
        </div>
      </div>

      {/* Pedidos recientes */}
      <div className="mk-vpanel">
        <div className="mk-vpanel-head">
          <div>
            <h3>Pedidos recientes</h3>
            <span className="mk-vpanel-sub">Últimos 6 pedidos</span>
          </div>
          <a href="/vendedor/pedidos" className="mk-block-link">
            Ver todos <Icon name="arrowRight" size={14} />
          </a>
        </div>

        {pedidosRec.length === 0 ? (
          <div className="mk-vempty">
            <Icon name="truck" size={32} stroke={1.5} />
            <p>Todavía no tienes pedidos. Cuando un comprador compre un producto tuyo, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="mk-vtable-wrap">
            <table className="mk-vtable">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidosRec.map((p) => {
                  const fecha = new Date(p.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
                  const badge = ESTADO_BADGE[p.estado] ?? { label: p.estado, tone: 'gray' as const }
                  return (
                    <tr key={p.id}>
                      <td><span className="mk-vorder-id">{p.id.slice(0, 8)}</span></td>
                      <td className="mk-vorder-prod">{p.nombre_comprador || 'Comprador'}</td>
                      <td><strong>{fmt(Number(p.total) || 0)}</strong></td>
                      <td className="mk-vorder-date">{fecha}</td>
                      <td><span className={'mk-vbadge ' + badge.tone}>{badge.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
