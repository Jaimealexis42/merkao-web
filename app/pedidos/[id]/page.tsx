'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fmt, ARANCELES } from '@/lib/precios'

type Pedido = {
  id: string
  comprador_id: string | null
  vendedor_id: string | null
  total: number
  comision: number | null
  estado: string
  direccion_entrega: string
  metodo_pago: string
  culqi_charge_id: string | null
  created_at: string
  // columnas escrow agregadas
  escrow_liberado: boolean
  igv: number
  arancel: number
  pais_comprador: string
  nombre_comprador: string
  email_comprador: string
}

const ESTADOS = [
  { key: 'pagado',    label: 'Pago recibido',    icono: '💳', desc: 'El pago está retenido en escrow de forma segura.' },
  { key: 'enviado',   label: 'Producto enviado', icono: '📦', desc: 'El vendedor despachó tu pedido. Espera la entrega.' },
  { key: 'entregado', label: 'Entregado',        icono: '🚚', desc: 'El producto fue entregado. Confirma si todo está correcto.' },
  { key: 'liberado',  label: 'Pago liberado',    icono: '💸', desc: 'Confirmaste la recepción. El pago fue liberado al vendedor.' },
]
const ESTADO_IDX: Record<string, number> = { pagado: 0, enviado: 1, entregado: 2, liberado: 3 }

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido]         = useState<Pedido | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [accion, setAccion]         = useState<'confirmar' | 'disputar' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje]       = useState('')

  useEffect(() => {
    supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: e }) => {
        if (e || !data) setError('Pedido no encontrado.')
        else setPedido(data)
        setLoading(false)
      })
  }, [id])

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
      if (nuevoEstado === 'liberado') setMensaje('✅ Recepción confirmada. El pago fue liberado al vendedor.')
      if (nuevoEstado === 'disputado') setMensaje('⚠️ Disputa abierta. Nuestro equipo te contactará en 24h.')
    }
    setProcesando(false)
    setAccion(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Cargando pedido...</p>
    </div>
  )

  if (error || !pedido) return (
    <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-gray-600">{error || 'Pedido no encontrado.'}</p>
        <a href="/" className="mt-4 inline-block text-sm underline" style={{ color: '#007185' }}>Volver al inicio</a>
      </div>
    </div>
  )

  const estadoActualIdx = ESTADO_IDX[pedido.estado] ?? 0
  const arancelInfo     = ARANCELES[pedido.pais_comprador]
  const base            = pedido.total - (pedido.igv ?? 0) - (pedido.arancel ?? 0)
  const fecha           = new Date(pedido.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>

      <header style={{ backgroundColor: '#131921' }} className="px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-0.5">
          <span className="text-white text-xl font-black">merkao</span>
          <span className="text-xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>
        <a href="/" className="text-gray-400 text-xs hover:text-white transition">← Volver al inicio</a>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Cabecera */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Seguimiento de pedido</h1>
            <p className="text-xs text-gray-400 mt-1">ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{pedido.id}</code></p>
            <p className="text-xs text-gray-400">Realizado el {fecha}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide ${
            pedido.estado === 'liberado'  ? 'bg-green-100 text-green-700' :
            pedido.estado === 'disputado' ? 'bg-red-100 text-red-700' :
            pedido.estado === 'cancelado' ? 'bg-gray-200 text-gray-600' :
            'bg-blue-100 text-blue-700'
          }`}>
            {pedido.estado === 'pagado'    ? '💳 Pagado'      :
             pedido.estado === 'enviado'   ? '📦 Enviado'     :
             pedido.estado === 'entregado' ? '🚚 Entregado'   :
             pedido.estado === 'liberado'  ? '💸 Completado'  :
             pedido.estado === 'disputado' ? '⚠️ En disputa' :
             pedido.estado}
          </span>
        </div>

        {mensaje && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">{mensaje}</div>
        )}

        {/* Timeline escrow */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-5">Estado del proceso escrow</h2>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
            <div className="absolute left-5 top-5 w-0.5 bg-green-400 transition-all duration-500"
              style={{ height: `${(estadoActualIdx / (ESTADOS.length - 1)) * 100}%` }} />
            <div className="space-y-6">
              {ESTADOS.map((est, i) => {
                const completado = i <= estadoActualIdx && !['cancelado','disputado'].includes(pedido.estado)
                const actual     = i === estadoActualIdx
                return (
                  <div key={est.key} className="flex items-start gap-4">
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 shrink-0 transition-all ${completado ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'} ${actual ? 'ring-4 ring-green-100' : ''}`}>
                      {est.icono}
                    </div>
                    <div className="flex-1 pt-2">
                      <p className={`text-sm font-bold ${completado ? 'text-gray-800' : 'text-gray-400'}`}>{est.label}</p>
                      <p className={`text-xs mt-0.5 ${actual ? 'text-green-600' : 'text-gray-400'}`}>{est.desc}</p>
                    </div>
                    {completado && i < estadoActualIdx && <span className="text-green-500 text-xs font-bold mt-2.5">✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Acciones cuando está entregado */}
        {pedido.estado === 'entregado' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-800 mb-2">¿Recibiste tu pedido?</h2>
            <p className="text-xs text-gray-500 mb-4">Confirma la recepción para liberar el pago al vendedor, o abre una disputa si hay algún problema.</p>
            {accion === null ? (
              <div className="flex gap-3">
                <button onClick={() => setAccion('confirmar')} className="flex-1 py-3 rounded-xl text-sm font-bold transition hover:brightness-110" style={{ backgroundColor: '#FF9900', color: '#131921' }}>
                  ✅ Confirmar recepción
                </button>
                <button onClick={() => setAccion('disputar')} className="flex-1 py-3 rounded-xl text-sm font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 transition">
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
                    style={{ backgroundColor: accion === 'confirmar' ? '#FF9900' : '#dc2626', color: accion === 'confirmar' ? '#131921' : 'white' }}
                  >
                    {procesando ? 'Procesando...' : accion === 'confirmar' ? 'Sí, confirmar' : 'Sí, abrir disputa'}
                  </button>
                  <button onClick={() => setAccion(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desglose financiero */}
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

        {/* Datos del comprador */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Datos de entrega</h2>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
            <div><p className="text-gray-400 mb-0.5">Comprador</p><p className="font-medium">{pedido.nombre_comprador || '—'}</p></div>
            <div><p className="text-gray-400 mb-0.5">Correo</p><p className="font-medium">{pedido.email_comprador || '—'}</p></div>
            <div className="col-span-2"><p className="text-gray-400 mb-0.5">Dirección</p><p className="font-medium">{pedido.direccion_entrega || '—'}</p></div>
          </div>
        </div>

      </div>
    </div>
  )
}
