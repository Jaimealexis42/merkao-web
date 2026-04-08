'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt, ARANCELES } from '@/lib/precios'

type Producto = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  precio_mayoreo?: number
  cantidad_minima_mayoreo?: number
  costo_envio?: number
  imagenes: string[]
  ciudad: string
  categoria_id: number
  stock: number
}

const METODOS_PAGO = [
  { id: 'yape',     label: 'Yape',                   icono: '💜' },
  { id: 'plin',     label: 'Plin',                   icono: '🟢' },
  { id: 'tarjeta',  label: 'Tarjeta crédito/débito', icono: '💳' },
  { id: 'efectivo', label: 'Efectivo (contra entrega)', icono: '💵' },
]

function CheckoutContent() {
  const params     = useSearchParams()
  const productoId = params.get('id')

  const [producto, setProducto]         = useState<Producto | null>(null)
  const [loadingProd, setLoadingProd]   = useState(true)
  const [pais, setPais]                 = useState('PE')
  const [metodoPago, setMetodoPago]     = useState('yape')
  const [cantidad, setCantidad]         = useState(1)
  const [enviando, setEnviando]         = useState(false)
  const [pedidoId, setPedidoId]         = useState<string | null>(null)
  const [error, setError]               = useState('')

  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', direccion: '', notas: '',
  })

  // Ref para pasar datos al callback global window.culqi
  const culqiDataRef = useRef<{
    token:    string
    monto:    number
    email:    string
  } | null>(null)

  // Detectar país
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => { if (d?.country_code) setPais(d.country_code) })
      .catch(() => {})
  }, [])

  // Cargar producto
  useEffect(() => {
    if (!productoId) { setLoadingProd(false); return }
    supabase
      .from('productos')
      .select('id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, imagenes, ciudad, categoria_id, stock')
      .eq('id', productoId)
      .single()
      .then(({ data, error: e }) => {
        if (e || !data) setError('Producto no encontrado.')
        else setProducto(data)
        setLoadingProd(false)
      })
  }, [productoId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  // ── Lógica de precios ──
  const esMayoreo = !!(
    producto?.precio_mayoreo &&
    producto?.cantidad_minima_mayoreo &&
    cantidad >= producto.cantidad_minima_mayoreo
  )
  const precioUnitario = esMayoreo ? producto!.precio_mayoreo! : (producto?.precio ?? 0)
  const costoEnvio     = producto?.costo_envio ?? 0
  const p              = calcularPrecios(precioUnitario * cantidad, pais)
  const totalConEnvio  = +(p.total + costoEnvio).toFixed(2)

  const handlePagarCulqi = (e: React.FormEvent) => {
    e.preventDefault()
    if (!producto) return
    setError('')

    const montoTotal    = costoEnvio > 0 ? totalConEnvio : p.total
    const montoCentimos = Math.round(montoTotal * 100)

    console.log('[Culqi] typeof window.Culqi:', typeof (window as any).Culqi)
    console.log('[Culqi] window.Culqi value:', (window as any).Culqi)

    const CulqiSDK = (window as any).Culqi
    if (typeof CulqiSDK === 'undefined' || CulqiSDK === null) {
      setError('El script de Culqi no cargó. Recarga la página.')
      return
    }

    // 1. Asignar public key primero
    CulqiSDK.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY

    // 2. Configurar el modal (order requerido por Culqi v4 para mostrar el botón de pago)
    CulqiSDK.settings({
      title:       'Merkao',
      currency:    'PEN',
      amount:      montoCentimos,
      description: producto.nombre.slice(0, 80),
    })

    // 3. Registrar callback ANTES de open() — Culqi lo invoca al tokenizar
    ;(window as any).culqi = async () => {
      const token = CulqiSDK.token
      const err   = CulqiSDK.error

      if (err) {
        setError(err.user_message ?? 'Error al procesar la tarjeta.')
        return
      }
      if (!token) return

      setEnviando(true)

      const res = await fetch('/api/culqi-charge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token:            token.id,
          monto:            montoCentimos,
          email:            form.email,
          producto_id:      producto.id,
          nombre_comprador: form.nombre,
          telefono:         form.telefono,
          direccion:        form.direccion,
          notas:            form.notas || null,
          pais_comprador:   pais,
          igv:              p.igv,
          arancel:          p.arancel,
          metodo_pago:      metodoPago,
        }),
      })

      const result = await res.json()
      setEnviando(false)

      if (!res.ok) {
        setError(result.error ?? 'Error al procesar el cobro. Intenta de nuevo.')
      } else {
        setPedidoId(result.pedido_id)
      }
    }

    // 4. Abrir modal
    console.log('[Culqi] Llamando open() con settings:', {
      publicKey: CulqiSDK.publicKey,
      amount:    montoCentimos,
    })
    CulqiSDK.open()
  }

  // ── Pantalla de éxito ──
  if (pedidoId) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">¡Pedido recibido!</h1>
          <p className="text-gray-500 text-sm mb-6">Tu pago está en custodia escrow. Se liberará al vendedor cuando confirmes que recibiste el producto.</p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Proceso escrow</p>
            {[
              ['✅', 'Pagado',    'Tu pago está retenido de forma segura',   true],
              ['📦', 'Enviado',   'El vendedor despacha tu pedido',           false],
              ['🚚', 'Entregado', 'Recibes el producto',                      false],
              ['💸', 'Liberado',  'Confirmás recepción → vendedor cobra',     false],
            ].map(([icono, label, desc, activo]) => (
              <div key={label as string} className={`flex items-start gap-3 ${activo ? 'opacity-100' : 'opacity-40'}`}>
                <span className="text-lg shrink-0">{icono}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{label as string}</p>
                  <p className="text-[11px] text-gray-500">{desc as string}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-6">ID de pedido: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{pedidoId}</code></p>
          <div className="flex gap-3">
            <a href={`/pedidos/${pedidoId}`} className="flex-1 py-3 rounded-xl text-sm font-bold text-center transition hover:brightness-110" style={{ backgroundColor: '#FF9900', color: '#131921' }}>
              Ver mi pedido →
            </a>
            <a href="/" className="flex-1 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 text-center hover:bg-gray-50 transition">
              Seguir comprando
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (loadingProd) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando producto...</p>
      </div>
    )
  }

  if (!producto || !productoId) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-600">Producto no encontrado.</p>
          <a href="/" className="mt-4 inline-block text-sm underline" style={{ color: '#007185' }}>Volver al inicio</a>
        </div>
      </div>
    )
  }

  const imagen      = producto.imagenes?.[0] ?? `https://picsum.photos/seed/${producto.id}/400/400`
  const arancelInfo = ARANCELES[pais]
  const hayMayoreo  = !!(producto.precio_mayoreo && producto.cantidad_minima_mayoreo)

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Navbar simple */}
      <header style={{ backgroundColor: '#131921' }} className="px-4 py-3 flex items-center gap-3">
        <a href="/" className="flex items-center gap-0.5">
          <span className="text-white text-xl font-black">merkao</span>
          <span className="text-xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>
        <span className="text-gray-400 text-sm">/ Checkout seguro 🔒</span>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Columna izquierda: formulario ── */}
        <form onSubmit={handlePagarCulqi} className="space-y-5">

          {/* Cantidad */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Cantidad</h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-full border-2 border-gray-300 text-gray-600 font-black text-lg hover:border-orange-400 transition flex items-center justify-center"
              >
                −
              </button>
              <span className="text-xl font-black text-gray-800 w-8 text-center">{cantidad}</span>
              <button
                type="button"
                onClick={() => setCantidad(c => Math.min(producto.stock, c + 1))}
                className="w-9 h-9 rounded-full border-2 border-gray-300 text-gray-600 font-black text-lg hover:border-orange-400 transition flex items-center justify-center"
              >
                +
              </button>
              <span className="text-xs text-gray-400">Stock: {producto.stock}</span>
            </div>

            {/* Info mayoreo */}
            {hayMayoreo && (
              <div className={`mt-3 rounded-xl p-3 text-xs border ${esMayoreo ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                {esMayoreo ? (
                  <>🎉 <strong>¡Precio mayoreo aplicado!</strong> Comprando {cantidad} unidades a <strong>{fmt(producto.precio_mayoreo!)}</strong> c/u</>
                ) : (
                  <>📦 Compra {producto.cantidad_minima_mayoreo}+ unidades para precio mayoreo: <strong>{fmt(producto.precio_mayoreo!)}</strong> c/u (ahorrás {fmt((producto.precio - producto.precio_mayoreo!) * cantidad)})</>
                )}
              </div>
            )}
          </div>

          {/* Datos del comprador */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Datos del comprador</h2>
            <div className="space-y-3">
              {[
                { name: 'nombre',    label: 'Nombre completo',      type: 'text',  placeholder: 'Juan Pérez',              required: true },
                { name: 'email',     label: 'Correo electrónico',   type: 'email', placeholder: 'juan@email.com',          required: true },
                { name: 'telefono',  label: 'Teléfono / WhatsApp',  type: 'tel',   placeholder: '+51 987 654 321',         required: false },
                { name: 'direccion', label: 'Dirección de entrega', type: 'text',  placeholder: 'Av. Lima 123, Miraflores', required: true },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={f.type}
                    name={f.name}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">País de entrega</label>
                <select
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition bg-white"
                >
                  <option value="PE">🇵🇪 Perú (sin arancel)</option>
                  {Object.entries(ARANCELES).map(([code, info]) => (
                    <option key={code} value={code}>{info.bandera} {info.pais} (arancel {Math.round(info.tasa * 100)}%)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas para el vendedor</label>
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={handleChange}
                  placeholder="Talla, color, instrucciones especiales..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Método de pago</h2>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                    metodoPago === m.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  <span className="text-xl">{m.icono}</span>
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
              <span className="text-base shrink-0">🔒</span>
              <p>Tu pago quedará <strong>retenido en escrow</strong> hasta que confirmes la recepción del producto.</p>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">⚠️ {error}</div>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-4 rounded-xl font-black text-base transition hover:brightness-110 disabled:opacity-60"
            style={{ backgroundColor: '#FF9900', color: '#131921' }}
          >
            {enviando
              ? 'Procesando pago...'
              : `💳 Pagar con tarjeta ${fmt(costoEnvio > 0 ? totalConEnvio : p.total)}`}
          </button>
        </form>

        {/* ── Columna derecha: resumen ── */}
        <div className="space-y-5">

          {/* Producto */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <img src={imagen} alt={producto.nombre} className="w-full h-48 object-cover" />
            <div className="p-5">
              <p className="text-sm font-bold text-gray-800 leading-snug">{producto.nombre}</p>
              {producto.ciudad && <p className="text-xs text-gray-400 mt-1">📍 {producto.ciudad}</p>}
              <p className="text-xs text-gray-500 mt-2 line-clamp-3">{producto.descripcion}</p>
            </div>
          </div>

          {/* Desglose de precio */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Resumen del pedido</h3>
            <div className="space-y-2 text-sm">

              {/* Precio unitario y cantidad */}
              <div className="flex justify-between text-gray-500 text-xs">
                <span>
                  Precio unitario
                  {esMayoreo && <span className="ml-1 text-green-600 font-bold">(mayoreo)</span>}
                </span>
                <span>{fmt(precioUnitario)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>× {cantidad} unidad{cantidad !== 1 ? 'es' : ''}</span>
                <span className="font-medium">{fmt(precioUnitario * cantidad)}</span>
              </div>

              {esMayoreo && (
                <div className="flex justify-between text-green-600 text-xs font-medium bg-green-50 rounded-lg px-2 py-1">
                  <span>Ahorro mayoreo</span>
                  <span>− {fmt((producto.precio - precioUnitario) * cantidad)}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-2 flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(p.base)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IGV 18%</span>
                <span>{fmt(p.igv)}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700 border-t border-gray-100 pt-2">
                <span>Subtotal c/IGV</span>
                <span>{fmt(p.subtotal)}</span>
              </div>

              {p.arancel > 0 && arancelInfo && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Arancel {arancelInfo.bandera} {Math.round(p.tasaArancel * 100)}%</span>
                  <span>+{fmt(p.arancel)}</span>
                </div>
              )}

              {/* Flete */}
              <div className="flex justify-between font-medium text-gray-700 border-t border-gray-100 pt-2">
                <span>🚚 Flete</span>
                <span>
                  {costoEnvio === 0
                    ? <span className="text-blue-500 font-normal text-xs">A acordar con vendedor</span>
                    : fmt(costoEnvio)
                  }
                </span>
              </div>

              <div className="flex justify-between font-black text-lg border-t border-gray-200 pt-2" style={{ color: '#B12704' }}>
                <span>Total a pagar</span>
                <span>
                  {costoEnvio > 0 ? fmt(totalConEnvio) : fmt(p.total)}
                  {costoEnvio === 0 && <span className="block text-[10px] font-normal text-blue-400">+ flete a coordinar</span>}
                </span>
              </div>
            </div>

            {arancelInfo && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                {arancelInfo.bandera} El arancel del {Math.round(p.tasaArancel * 100)}% corresponde a la importación a <strong>{arancelInfo.pais}</strong>.
              </div>
            )}
          </div>

          {/* Garantía escrow */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">🔒 Garantía Escrow Merkao</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              {[
                '✅ El dinero no llega al vendedor hasta que confirmes recepción',
                '📦 Si el producto no llega en el plazo, te devolvemos el 100%',
                '🔍 Puedes abrir una disputa si el producto no es el descrito',
                '⏱️ Tienes 7 días para confirmar o disputar tras la entrega',
              ].map((l) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando checkout...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
