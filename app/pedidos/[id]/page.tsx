'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fmt, ARANCELES } from '@/lib/precios'
import { useAuth } from '@/lib/useAuth'

/* ─── Tipos ─── */

type Pedido = {
  id: string
  comprador_id: string | null
  vendedor_id: string | null
  producto_id: string | null
  total: number
  comision: number | null
  estado: string
  direccion_entrega: string
  metodo_pago: string
  culqi_charge_id: string | null
  created_at: string
  escrow_liberado: boolean
  igv: number
  arancel: number
  pais_comprador: string
  nombre_comprador: string
  email_comprador: string
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
  imagenes: string[]
  ciudad: string | null
  vendedor_id: string | null
  categoria_id: number
}

/* ─── Timeline ─── */

const TIMELINE = [
  { key: 'pagado',    label: 'Pago recibido',    icono: '💳', desc: 'El pago está retenido en escrow de forma segura.' },
  { key: 'enviado',   label: 'Producto enviado', icono: '📦', desc: 'El vendedor despachó tu pedido. En camino.' },
  { key: 'entregado', label: 'Entregado',        icono: '🚚', desc: 'El producto fue entregado. Confirma si todo está OK.' },
  { key: 'liberado',  label: 'Pago liberado',    icono: '💸', desc: 'Confirmaste la recepción. El pago fue liberado al vendedor.' },
]
const TIMELINE_IDX: Record<string, number> = { pagado: 0, enviado: 1, entregado: 2, liberado: 3 }

/* ─── Helpers ─── */

function estadoBadgeClases(estado: string) {
  if (estado === 'liberado')  return 'bg-green-100 text-green-700'
  if (estado === 'disputado') return 'bg-red-100 text-red-700'
  if (estado === 'cancelado') return 'bg-gray-200 text-gray-600'
  return 'bg-blue-100 text-blue-700'
}

function estadoLabel(estado: string) {
  const map: Record<string, string> = {
    pagado: '💳 Pagado', enviado: '📦 Enviado', entregado: '🚚 Entregado',
    liberado: '💸 Completado', disputado: '⚠️ En disputa', cancelado: '✕ Cancelado',
  }
  return map[estado] ?? estado
}

/* ─── Página ─── */

export default function PedidoPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pedido, setPedido]         = useState<Pedido | null>(null)
  const [items, setItems]           = useState<PedidoItem[]>([])
  const [producto, setProducto]     = useState<Producto | null>(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [accion, setAccion]         = useState<'confirmar' | 'disputar' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje]       = useState('')

  /* ── 1. Esperar auth y redirigir si no hay sesión ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  /* ── 2. Cargar pedido ── */
  useEffect(() => {
    if (!id || authLoading || !user) return

    supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single()
      .then(async ({ data, error: e }) => {
        if (e || !data) { setNotFound(true); setLoading(false); return }

        // ── Verificar ownership ──
        // Si el pedido tiene comprador_id asignado, debe coincidir con el usuario.
        // Si comprador_id es null (checkout como invitado), verificar por email.
        const esOwner =
          (data.comprador_id && data.comprador_id === user.id) ||
          (!data.comprador_id && data.email_comprador === user.email)

        if (!esOwner) { router.replace('/'); return }

        setPedido(data as Pedido)

        // ── 3a. Intentar cargar pedido_items ──
        const { data: itemsData } = await supabase
          .from('pedido_items')
          .select('id, nombre_producto, cantidad, precio_unitario, imagen_url')
          .eq('pedido_id', id)

        if (itemsData && itemsData.length > 0) {
          setItems(itemsData as PedidoItem[])
        } else if (data.producto_id) {
          // ── 3b. Fallback: cargar el producto único del pedido ──
          const { data: prod } = await supabase
            .from('productos')
            .select('id, nombre, imagenes, ciudad, vendedor_id, categoria_id')
            .eq('id', data.producto_id)
            .single()
          if (prod) setProducto(prod as Producto)
        }

        setLoading(false)
      })
  }, [id, authLoading, user, router])

  /* ── Cambiar estado (confirmar / disputar) ── */
  const cambiarEstado = async (nuevoEstado: string) => {
    if (!pedido) return
    setProcesando(true)
    const updates: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === 'liberado') updates.escrow_liberado = true

    const { error: e } = await supabase
      .from('pedidos')
      .update(updates)
      .eq('id', pedido.id)

    if (e) {
      setMensaje('Error al actualizar: ' + e.message)
    } else {
      setPedido({ ...pedido, ...updates } as Pedido)
      if (nuevoEstado === 'liberado')  setMensaje('✅ Recepción confirmada. El pago fue liberado al vendedor.')
      if (nuevoEstado === 'disputado') setMensaje('⚠️ Disputa abierta. Nuestro equipo te contactará en 24h.')
    }
    setProcesando(false)
    setAccion(null)
  }

  /* ── Estados de carga ── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Cargando pedido...</p>
      </div>
    )
  }

  if (notFound || !pedido) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-5xl mb-3">⚠️</p>
          <p className="text-gray-700 font-bold">Pedido no encontrado</p>
          <p className="text-sm text-gray-400 mt-1">El ID no existe o no tienes acceso.</p>
          <a href="/" className="mt-4 inline-block text-sm underline" style={{ color: '#007185' }}>Volver al inicio</a>
        </div>
      </div>
    )
  }

  const estadoIdx  = TIMELINE_IDX[pedido.estado] ?? 0
  const arancelInfo = ARANCELES[pedido.pais_comprador]
  const base        = pedido.total - (pedido.igv ?? 0) - (pedido.arancel ?? 0)
  const fecha       = new Date(pedido.created_at).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#131921' }}>
        <a href="/" className="flex items-center gap-0.5 border-2 border-transparent hover:border-white rounded px-1 py-1 transition shrink-0">
          <span className="text-white text-2xl font-black tracking-tight">merkao</span>
          <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>
        <div className="flex-1" />
        <a href="/perfil" className="text-gray-300 text-xs hover:text-white transition hidden sm:inline">👤 Mi perfil</a>
        <a href="/" className="text-gray-400 text-xs hover:text-white transition">← Inicio</a>
      </header>

      {/* Breadcrumb */}
      <div style={{ backgroundColor: '#232f3e' }}>
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2 text-xs text-gray-400">
          <a href="/" className="hover:text-white transition">Inicio</a>
          <span>/</span>
          <a href="/perfil" className="hover:text-white transition">Mi perfil</a>
          <span>/</span>
          <span className="text-white">Pedido</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ── Cabecera del pedido ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Seguimiento de pedido</h1>
            <p className="text-xs text-gray-400 mt-1">
              ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{pedido.id}</code>
            </p>
            <p className="text-xs text-gray-400">Realizado el {fecha}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide ${estadoBadgeClases(pedido.estado)}`}>
            {estadoLabel(pedido.estado)}
          </span>
        </div>

        {mensaje && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
            {mensaje}
          </div>
        )}

        {/* ── Timeline escrow ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-5">Estado del proceso</h2>
          <div className="relative">
            {/* Track line */}
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
            <div
              className="absolute left-5 top-5 w-0.5 bg-green-400 transition-all duration-700"
              style={{ height: `${(estadoIdx / (TIMELINE.length - 1)) * 100}%` }}
            />

            <div className="space-y-6">
              {TIMELINE.map((step, i) => {
                const completado = i <= estadoIdx && !['cancelado', 'disputado'].includes(pedido.estado)
                const actual     = i === estadoIdx
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 shrink-0 transition-all ${
                      completado ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
                    } ${actual ? 'ring-4 ring-green-100 shadow-sm' : ''}`}>
                      {step.icono}
                    </div>
                    <div className="flex-1 pt-2">
                      <p className={`text-sm font-bold ${completado ? 'text-gray-800' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${actual ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                        {step.desc}
                      </p>
                    </div>
                    {completado && i < estadoIdx && (
                      <span className="text-green-500 text-sm font-black mt-2.5">✓</span>
                    )}
                    {actual && !['liberado', 'disputado', 'cancelado'].includes(pedido.estado) && (
                      <span className="mt-2.5 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Actual
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Productos del pedido ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Productos en este pedido</h2>
          </div>

          {items.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt={item.nombre_producto} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl text-gray-300">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{item.nombre_producto}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Cantidad: {item.cantidad}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-gray-900">{fmt(item.precio_unitario * item.cantidad)}</p>
                    <p className="text-xs text-gray-400">{fmt(item.precio_unitario)} c/u</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : producto ? (
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                {producto.imagenes?.[0] ? (
                  <img src={producto.imagenes[0]} alt={producto.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-gray-300">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{producto.nombre}</p>
                {producto.ciudad && (
                  <p className="text-xs text-gray-400 mt-0.5">📍 {producto.ciudad}, Perú</p>
                )}
              </div>
              <a
                href={`/productos/${producto.id}`}
                className="text-xs font-bold shrink-0 hover:underline"
                style={{ color: '#007185' }}
              >
                Ver producto →
              </a>
            </div>
          ) : (
            <div className="px-6 py-6 text-center text-sm text-gray-400">
              Sin detalle de productos disponible.
            </div>
          )}
        </div>

        {/* ── Vendedor ── */}
        {(producto?.ciudad || producto?.vendedor_id) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center text-xl shrink-0">
              🏪
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Vendedor</p>
              <p className="text-sm font-bold text-gray-800">Tienda Merkao</p>
              {producto?.ciudad && (
                <p className="text-xs text-gray-500 mt-0.5">📍 {producto.ciudad}, Perú</p>
              )}
            </div>
            <div className="text-right shrink-0 text-xs text-gray-400">
              <p>🔒 Escrow activo</p>
              <p className="mt-0.5">Pago protegido</p>
            </div>
          </div>
        )}

        {/* ── Acción: confirmar o disputar (cuando está entregado) ── */}
        {pedido.estado === 'entregado' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-800 mb-1">¿Recibiste tu pedido?</h2>
            <p className="text-xs text-gray-500 mb-4">
              Confirma la recepción para liberar el pago al vendedor, o abre una disputa si hay algún problema.
            </p>
            {accion === null ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setAccion('confirmar')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition hover:brightness-110"
                  style={{ backgroundColor: '#FF9900', color: '#131921' }}
                >
                  ✅ Confirmar recepción
                </button>
                <button
                  onClick={() => setAccion('disputar')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 transition"
                >
                  ⚠️ Abrir disputa
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {accion === 'confirmar'
                    ? '¿Confirmas que recibiste el producto en buen estado? El pago se liberará al vendedor.'
                    : '¿Quieres abrir una disputa? Nuestro equipo revisará el caso en 24–48h.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => cambiarEstado(accion === 'confirmar' ? 'liberado' : 'disputado')}
                    disabled={procesando}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
                    style={{
                      backgroundColor: accion === 'confirmar' ? '#FF9900' : '#dc2626',
                      color: accion === 'confirmar' ? '#131921' : 'white',
                    }}
                  >
                    {procesando ? 'Procesando...' : accion === 'confirmar' ? 'Sí, confirmar' : 'Sí, abrir disputa'}
                  </button>
                  <button
                    onClick={() => setAccion(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Resumen financiero ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Resumen del pago</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Precio base</span>
              <span>{fmt(base)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>IGV 18%</span>
              <span>{fmt(pedido.igv ?? 0)}</span>
            </div>
            {(pedido.arancel ?? 0) > 0 && arancelInfo && (
              <div className="flex justify-between text-amber-600">
                <span>Arancel {arancelInfo.bandera} {Math.round(arancelInfo.tasa * 100)}%</span>
                <span>+{fmt(pedido.arancel)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-base border-t border-gray-100 pt-2" style={{ color: '#B12704' }}>
              <span>Total pagado</span>
              <span>{fmt(pedido.total)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <span>💳</span>
            <span>Método: <strong className="text-gray-600">{pedido.metodo_pago}</strong></span>
            {pedido.escrow_liberado
              ? <span className="ml-auto text-green-600 font-bold">✓ Escrow liberado</span>
              : <span className="ml-auto text-blue-600 font-bold">🔒 En custodia escrow</span>}
          </div>
        </div>

        {/* ── Datos de entrega ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Datos de entrega</h2>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
            <div>
              <p className="text-gray-400 mb-0.5">Comprador</p>
              <p className="font-medium">{pedido.nombre_comprador || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Correo</p>
              <p className="font-medium">{pedido.email_comprador || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 mb-0.5">Dirección</p>
              <p className="font-medium">{pedido.direccion_entrega || '—'}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
