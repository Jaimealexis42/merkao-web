'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt } from '@/lib/precios'
import { useCarritoStore } from '@/src/store/carritoStore'

type Producto = {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_oferta: number | null
  precio_mayoreo: number | null
  cantidad_minima_mayoreo: number | null
  costo_envio: number | null
  ciudad: string | null
  categoria: string
  condicion: string
  stock: number
  imagen_url: string | null
  vendedor_id: string | null
}

const ICONO_CATEGORIA: Record<string, string> = {
  'Ropa y Moda':    '👗',
  'Electrónicos':   '📱',
  'Alimentos':      '🥗',
  'Artesanías':     '🎨',
  'Hogar':          '🛋️',
  'Autos y Motos':  '🚗',
  'Agrícola':       '🌾',
  'Salud y Belleza':'💄',
  'Deportes':       '⚽',
  'Juguetes':       '🧸',
  'Libros':         '📚',
  'Otros':          '📦',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${star <= Math.floor(rating) ? 'text-yellow-400' : star - 0.5 <= rating ? 'text-yellow-300' : 'text-gray-200'}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [producto, setProducto]     = useState<Producto | null>(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [cantidad, setCantidad]     = useState(1)
  const [imagenActiva, setImagenActiva] = useState(0)
  const [addedToCart, setAddedToCart]   = useState(false)
  const agregarItem  = useCarritoStore((s) => s.agregarItem)
  const totalItems   = useCarritoStore((s) => s.totalItems)

  useEffect(() => {
    if (!id) return
    supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setProducto(data as Producto)
        }
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Cargando producto...</p>
      </div>
    )
  }

  if (notFound || !producto) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-5xl">📦</p>
        <p className="text-xl font-black text-gray-800">Producto no encontrado</p>
        <p className="text-sm text-gray-500">Este producto no existe o fue eliminado.</p>
        <a href="/" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition">
          Volver al inicio
        </a>
      </div>
    )
  }

  const precioActivo = (
    producto.precio_mayoreo &&
    producto.cantidad_minima_mayoreo &&
    cantidad >= producto.cantidad_minima_mayoreo
  )
    ? producto.precio_mayoreo
    : (producto.precio_oferta ?? producto.precio)

  const precios        = calcularPrecios(precioActivo)
  const totalConEnvio  = precios.subtotal + (producto.costo_envio ?? 0)
  const esMayoreo      = !!(producto.precio_mayoreo && producto.cantidad_minima_mayoreo && cantidad >= producto.cantidad_minima_mayoreo)
  const hayOferta      = !esMayoreo && !!producto.precio_oferta
  const precioOriginal = producto.precio

  // Galería: imagen real si existe, más 3 slots vacíos de muestra
  const icono   = ICONO_CATEGORIA[producto.categoria] ?? '📦'
  const galeria = producto.imagen_url
    ? [producto.imagen_url, null, null]
    : [null, null, null]

  const handleBuyNow = () => {
    router.push(`/checkout?id=${producto.id}&cantidad=${cantidad}`)
  }

  const handleAddToCart = () => {
    if (!producto) return
    agregarItem(
      {
        id:       producto.id,
        nombre:   producto.nombre,
        precio:   precios.subtotal,
        imagen:   producto.imagen_url,
        vendedor: producto.ciudad ?? 'Vendedor Merkao',
      },
      cantidad,
    )
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const incrementar = () => {
    if (cantidad < producto.stock) setCantidad((q) => q + 1)
  }

  const decrementar = () => {
    if (cantidad > 1) setCantidad((q) => q - 1)
  }

  // Rating estático — sin tabla de reseñas aún
  const rating     = 4.5
  const numResenas = 12

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#131921' }}>
        <a href="/" className="flex items-center gap-0.5 border-2 border-transparent hover:border-white rounded px-1 py-1 transition shrink-0">
          <span className="text-white text-2xl font-black tracking-tight">merkao</span>
          <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>

        <div className="flex-1" />

        <a
          href="/carrito"
          className="relative flex items-end gap-1 border-2 border-transparent hover:border-white rounded px-2 py-1 transition shrink-0"
        >
          <div className="relative">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
            </svg>
            {totalItems() > 0 && (
              <span className="absolute -top-1 -right-1 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white">
                {totalItems() > 99 ? '99+' : totalItems()}
              </span>
            )}
          </div>
          <span className="text-white text-xs font-bold hidden sm:inline pb-1">Carrito</span>
        </a>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <a href="/" className="hover:text-orange-500 transition">Inicio</a>
          <span>/</span>
          <a href={`/?categoria=${producto.categoria}`} className="hover:text-orange-500 transition">
            {producto.categoria}
          </a>
          <span>/</span>
          <span className="text-gray-600 truncate max-w-[200px]">{producto.nombre}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ─── COLUMNA IZQUIERDA: Galería ─── */}
          <div className="space-y-3">

            {/* Imagen principal */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden aspect-square flex items-center justify-center">
              {galeria[imagenActiva] ? (
                <img
                  src={galeria[imagenActiva]!}
                  alt={producto.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-gray-300">
                  <span className="text-9xl">{icono}</span>
                  <span className="text-sm text-gray-300">Sin foto disponible</span>
                </div>
              )}
            </div>

            {/* Miniaturas */}
            <div className="flex gap-2">
              {galeria.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImagenActiva(i)}
                  className={`flex-1 aspect-square bg-white rounded-xl border-2 transition flex items-center justify-center overflow-hidden ${
                    imagenActiva === i
                      ? 'border-orange-400 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-gray-200">{icono}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Condición */}
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                producto.condicion === 'nuevo'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {producto.condicion === 'nuevo' ? '✨ Nuevo' : '🔄 Usado'}
              </span>
              {producto.stock <= 5 && producto.stock > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                  ⚡ ¡Últimas {producto.stock} unidades!
                </span>
              )}
              {producto.stock === 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  Sin stock
                </span>
              )}
            </div>
          </div>

          {/* ─── COLUMNA DERECHA: Info y compra ─── */}
          <div className="space-y-5">

            {/* Nombre y rating */}
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                {producto.nombre}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={rating} />
                <span className="text-sm font-bold text-gray-700">{rating}</span>
                <span className="text-xs text-gray-400">({numResenas} reseñas)</span>
              </div>
            </div>

            {/* Precio principal */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">

              {/* Badge mayoreo */}
              {esMayoreo && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-bold flex items-center gap-2">
                  <span className="text-base">📦</span>
                  ¡Precio mayoreo aplicado! ({cantidad}+ unidades)
                </div>
              )}

              {/* Precio con tachado si hay oferta o mayoreo */}
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-4xl font-black text-orange-500">
                  {fmt(precios.subtotal)}
                </span>
                {(hayOferta || esMayoreo) && (
                  <span className="text-lg text-gray-400 line-through mb-1">
                    {fmt(calcularPrecios(precioOriginal).subtotal)}
                  </span>
                )}
                {hayOferta && !esMayoreo && (
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full mb-1">
                    -{Math.round((1 - (producto.precio_oferta! / precioOriginal)) * 100)}% OFF
                  </span>
                )}
              </div>

              {/* Desglose IGV */}
              <div className="text-xs text-gray-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Precio sin IGV</span>
                  <span>{fmt(precios.base)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGV (18%)</span>
                  <span>{fmt(precios.igv)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-600 border-t border-gray-100 pt-1 mt-1">
                  <span>Subtotal c/IGV</span>
                  <span>{fmt(precios.subtotal)}</span>
                </div>
              </div>

              {/* Flete */}
              <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span>🚚</span> Costo de envío
                </span>
                {!producto.costo_envio || producto.costo_envio === 0 ? (
                  <span className="text-blue-600 font-medium text-xs">A acordar con vendedor</span>
                ) : (
                  <span className="font-bold text-gray-800">{fmt(producto.costo_envio)}</span>
                )}
              </div>

              {/* Total estimado con flete */}
              {producto.costo_envio && producto.costo_envio > 0 && (
                <div className="flex items-center justify-between text-sm font-black text-gray-900 bg-gray-50 rounded-xl px-3 py-2">
                  <span>Total estimado (×{cantidad})</span>
                  <span>{fmt((totalConEnvio) * cantidad)}</span>
                </div>
              )}
            </div>

            {/* Precio por mayor */}
            {producto.precio_mayoreo && producto.cantidad_minima_mayoreo && !esMayoreo && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-green-800 mb-1">📦 Descuento por volumen</p>
                <p className="text-sm text-green-700">
                  Compra <strong>{producto.cantidad_minima_mayoreo}+</strong> unidades y paga solo{' '}
                  <strong>{fmt(calcularPrecios(producto.precio_mayoreo).subtotal)}</strong> c/u
                  {' '}(ahorras{' '}
                  <strong>
                    {fmt(precios.subtotal - calcularPrecios(producto.precio_mayoreo).subtotal)}
                  </strong>{' '}
                  por unidad)
                </p>
              </div>
            )}

            {/* Selector de cantidad */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Cantidad</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={decrementar}
                    disabled={cantidad <= 1}
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition disabled:opacity-30 text-xl font-bold"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-black text-gray-900">{cantidad}</span>
                  <button
                    onClick={incrementar}
                    disabled={cantidad >= producto.stock}
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition disabled:opacity-30 text-xl font-bold"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-gray-400">{producto.stock} disponibles</span>
              </div>

              {/* Hint mayoreo */}
              {producto.precio_mayoreo && producto.cantidad_minima_mayoreo && !esMayoreo && (
                <p className="text-xs text-green-600">
                  Agrega {producto.cantidad_minima_mayoreo - cantidad} más para precio mayoreo
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              <button
                onClick={handleBuyNow}
                disabled={producto.stock === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl text-base transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {producto.stock === 0 ? 'Sin stock' : '⚡ Comprar ahora'}
              </button>
              <button
                onClick={handleAddToCart}
                disabled={producto.stock === 0}
                className={`w-full border-2 font-black py-4 rounded-2xl text-base transition ${
                  addedToCart
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-orange-400 text-orange-600 hover:bg-orange-50'
                }`}
              >
                {addedToCart ? '✅ ¡Agregado al carrito!' : '🛒 Agregar al carrito'}
              </button>
            </div>

            {/* Info vendedor */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl shrink-0">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium">Vendedor</p>
                <p className="font-bold text-gray-800 text-sm">Tienda Merkao</p>
                {producto.ciudad && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <span>📍</span> {producto.ciudad}, Perú
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <StarRating rating={rating} />
                <p className="text-xs text-gray-400 mt-0.5">{numResenas} ventas</p>
              </div>
            </div>

            {/* Garantías */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icono: '🔒', label: 'Pago seguro' },
                { icono: '✅', label: 'Compra protegida' },
                { icono: '🚚', label: 'Envío a todo el Perú' },
              ].map(({ icono, label }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 p-3">
                  <p className="text-xl mb-1">{icono}</p>
                  <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SECCIÓN: Descripción ─── */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-black text-gray-800 mb-4">Descripción del producto</h2>
          {producto.descripcion ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {producto.descripcion}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">El vendedor no añadió descripción.</p>
          )}
        </div>

        {/* ─── SECCIÓN: Reseñas placeholder ─── */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-800">Reseñas</h2>
            <div className="flex items-center gap-2">
              <StarRating rating={rating} />
              <span className="font-black text-gray-800">{rating}</span>
              <span className="text-sm text-gray-400">/ 5 ({numResenas})</span>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { autor: 'María G.', texto: 'Excelente calidad, llegó rápido y bien empaquetado. Lo recomiendo.', estrellas: 5, fecha: 'hace 3 días' },
              { autor: 'Carlos T.', texto: 'Muy bueno, tal como se describe. El vendedor responde rápido.', estrellas: 4, fecha: 'hace 1 semana' },
            ].map((r, i) => (
              <div key={i} className="border-t border-gray-50 pt-4 first:border-0 first:pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-xs font-black text-orange-600">
                    {r.autor[0]}
                  </div>
                  <span className="text-sm font-bold text-gray-800">{r.autor}</span>
                  <StarRating rating={r.estrellas} />
                  <span className="text-xs text-gray-400 ml-auto">{r.fecha}</span>
                </div>
                <p className="text-sm text-gray-600 ml-9">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
