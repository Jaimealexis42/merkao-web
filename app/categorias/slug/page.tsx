'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt } from '@/lib/precios'
import { T, CAT_NAMES, type Lang } from '@/lib/translations'
import { useCarritoStore } from '@/src/store/carritoStore'

const CATEGORIAS: Record<string, { id: number; icono: string }> = {
  'ropa-y-moda':     { id: 1, icono: '👗' },
  'electronicos':    { id: 2, icono: '📱' },
  'alimentos':       { id: 3, icono: '🥗' },
  'artesanias':      { id: 4, icono: '🎨' },
  'hogar':           { id: 5, icono: '🛋️' },
  'autos-y-motos':   { id: 6, icono: '🚗' },
  'agricola':        { id: 7, icono: '🌾' },
  'otros':           { id: 8, icono: '📦' },
}

type Producto = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  precio_mayoreo?: number
  cantidad_minima_mayoreo?: number
  costo_envio?: number
  stock: number
  categoria_id: number
  imagenes: string[]
  estado: string
  ciudad: string
  vistas: number
}

function getRating(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Math.round((4.0 + (n % 11) / 10) * 10) / 10
}
function getReviews(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 50 + (n % 950)
}

function Estrellas({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-[#FFA41C]' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function CategoriaPage() {
  const params = useParams()
  const slug = params.slug as string
  const cat = CATEGORIAS[slug]

  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [agregarAnim, setAgregarAnim] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('es')
  const totalItems = useCarritoStore((s) => s.totalItems)

  const tr = T[lang]
  const catNames = CAT_NAMES[lang]

  useEffect(() => {
    const saved = localStorage.getItem('merkao_lang') as Lang | null
    if (saved && ['es', 'en', 'pt'].includes(saved)) setLang(saved)
  }, [])

  useEffect(() => {
    if (!cat) return
    async function cargar() {
      setLoading(true)
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, stock, categoria_id, imagenes, estado, ciudad, vistas')
        .eq('estado', 'activo')
        .eq('categoria_id', cat.id)
        .order('vistas', { ascending: false })
      setProductos(data || [])
      setLoading(false)
    }
    cargar()
  }, [slug])

  const filtrados = busqueda.trim()
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos

  const agregarAlCarrito = (id: string) => {
    setAgregarAnim(id)
    setTimeout(() => setAgregarAnim(null), 700)
  }

  if (!cat) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <h1 className="text-xl font-bold text-gray-700 mb-2">Categoría no encontrada</h1>
          <a href="/" className="text-sm underline text-blue-600">Volver al inicio</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* HEADER */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#131921' }}>
        <div className="px-4 py-2.5 flex items-center gap-3">
          <a href="/" className="shrink-0 flex items-center gap-0.5 border-2 border-transparent hover:border-white rounded px-1 py-1 transition">
            <span className="text-white text-2xl font-black tracking-tight">merkao</span>
            <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
          </a>
          <div className="flex-1 flex rounded-lg overflow-hidden h-10 max-w-3xl">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={`Buscar en ${catNames[cat.id]}...`}
              className="flex-1 px-4 text-sm text-gray-800 outline-none"
            />
            <button className="px-4 flex items-center justify-center hover:brightness-110 transition shrink-0" style={{ backgroundColor: '#FF9900' }}>
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <a href="/carrito" className="relative flex items-end gap-1 border-2 border-transparent hover:border-white rounded px-2 py-1 transition shrink-0">
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
          </a>
        </div>
        <div style={{ backgroundColor: '#232f3e' }}>
          <div className="px-4 py-2 flex items-center gap-2">
            <a href="/" className="text-gray-400 text-xs hover:text-white transition">← Inicio</a>
            <span className="text-gray-600 text-xs">/</span>
            <span className="text-white text-xs font-bold">{cat.icono} {catNames[cat.id]}</span>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">

        {/* Título */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            {cat.icono} {catNames[cat.id]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Cargando...' : `${filtrados.length} productos encontrados`}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {loading && Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="bg-gray-200 h-44 w-full" />
              <div className="p-3 space-y-2">
                <div className="bg-gray-200 h-3 rounded w-full" />
                <div className="bg-gray-200 h-4 rounded w-1/2" />
                <div className="bg-gray-200 h-8 rounded w-full mt-1" />
              </div>
            </div>
          ))}

          {!loading && filtrados.map((prod) => {
            const rating = getRating(prod.id)
            const reviews = getReviews(prod.id)
            const imagen = prod.imagenes?.[0] ?? `https://picsum.photos/seed/${prod.id}/400/400`
            const enCarrito = agregarAnim === prod.id
            const p = calcularPrecios(prod.precio, 'PE')

            return (
              <div key={prod.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 overflow-hidden group flex flex-col">
                <a href={`/productos/${prod.id}`} className="relative overflow-hidden bg-gray-50 h-40 block">
                  <img src={imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  {prod.stock <= 5 && prod.stock > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">¡Últimas {prod.stock}!</span>
                  )}
                  {prod.ciudad && (
                    <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-white bg-black/40 py-0.5">📍 {prod.ciudad}</span>
                  )}
                </a>
                <div className="p-3 flex flex-col flex-1">
                  <a href={`/productos/${prod.id}`} className="text-xs text-gray-700 line-clamp-2 leading-snug mb-2 flex-1 hover:text-orange-600 transition">{prod.nombre}</a>
                  <div className="flex items-center gap-1 mb-2">
                    <Estrellas rating={rating} />
                    <span className="text-[11px] text-[#007185]">({reviews})</span>
                  </div>
                  <span className="text-lg font-black mb-2 block" style={{ color: '#B12704' }}>{fmt(p.total)}</span>
                  <div className="text-[10px] mb-2">
                    {!prod.costo_envio
                      ? <span className="text-blue-500">🚚 {tr.agree_shipping}</span>
                      : <span className="text-gray-500">🚚 {tr.shipping_prefix}{fmt(prod.costo_envio)}</span>
                    }
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <a href={`/checkout?id=${prod.id}`} className="w-full text-xs font-bold py-2 rounded-lg text-center transition hover:brightness-95 text-gray-900" style={{ backgroundColor: '#FF9900' }}>
                      {tr.buy_now}
                    </a>
                    <button
                      onClick={() => agregarAlCarrito(prod.id)}
                      className={`w-full text-xs font-bold py-1.5 rounded-lg border transition-all ${enCarrito ? 'bg-green-500 text-white border-green-500 scale-95' : 'border-gray-300 text-gray-700 hover:border-gray-400 bg-white'}`}
                    >
                      {enCarrito ? tr.added : tr.add_to_cart}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {!loading && filtrados.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-600 font-bold">No hay productos en esta categoría todavía</p>
              <a href="/" className="mt-3 inline-block text-sm underline" style={{ color: '#007185' }}>Volver al inicio</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}