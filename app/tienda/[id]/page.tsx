'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/precios'

type Tienda = {
  id: string
  nombre: string | null
  descripcion: string | null
  logo_url: string | null
}

type Producto = {
  id: string
  nombre: string
  precio: number
  precio_oferta: number | null
  categoria: string
  condicion: string
  stock: number
  imagen_url: string | null
  estado: string
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

export default function TiendaPublicaPage() {
  const { id } = useParams<{ id: string }>()

  const [tienda, setTienda]       = useState<Tienda | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)

  useEffect(() => {
    if (!id) return
    let cancel = false

    const cargar = async () => {
      setLoading(true)

      const [tiendaRes, productosRes] = await Promise.all([
        supabase
          .from('tiendas')
          .select('id, nombre, descripcion, logo_url')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('productos')
          .select('id, nombre, precio, precio_oferta, categoria, condicion, stock, imagen_url, estado')
          .eq('vendedor_id', id)
          .eq('estado', 'activo')
          .order('created_at', { ascending: false }),
      ])

      if (cancel) return

      // Si no hay perfil de tienda Y no hay productos, mostramos 404.
      // Si hay productos, mostramos la tienda aunque el perfil esté vacío.
      if (!tiendaRes.data && (productosRes.data?.length ?? 0) === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setTienda(tiendaRes.data ?? { id, nombre: null, descripcion: null, logo_url: null })
      setProductos(productosRes.data ?? [])
      setLoading(false)
    }

    cargar()
    return () => { cancel = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Cargando tienda...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-5xl">🏪</p>
        <p className="text-xl font-black text-gray-800">Tienda no encontrada</p>
        <p className="text-sm text-gray-500">Esta tienda no existe o aún no publicó productos.</p>
        <a href="/" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition">
          Volver al inicio
        </a>
      </div>
    )
  }

  const nombreVisible = tienda?.nombre || 'Tienda en Merkao'
  const inicial = (tienda?.nombre || 'M')[0].toUpperCase()

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#131921' }}>
        <a href="/" className="flex items-center gap-0.5 border-2 border-transparent hover:border-white rounded px-1 py-1 transition shrink-0">
          <span className="text-white text-2xl font-black tracking-tight">merkao</span>
          <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>
        <div className="flex-1" />
        <a href="/carrito" className="flex items-end gap-1 border-2 border-transparent hover:border-white rounded px-2 py-1 transition shrink-0">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
          </svg>
          <span className="text-white text-xs font-bold hidden sm:inline pb-0.5">Carrito</span>
        </a>
      </header>

      {/* Breadcrumb */}
      <div style={{ backgroundColor: '#232f3e' }}>
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2 text-xs text-gray-400">
          <a href="/" className="hover:text-white transition">Inicio</a>
          <span>/</span>
          <span className="text-white truncate">{nombreVisible}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Cabecera de la tienda */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="shrink-0">
              {tienda?.logo_url ? (
                <img
                  src={tienda.logo_url}
                  alt={nombreVisible}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-orange-100"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black text-white border-4 border-orange-100"
                  style={{ backgroundColor: '#FF9900' }}
                >
                  {inicial}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{nombreVisible}</h1>
              <p className="text-xs text-gray-400 mt-1">
                {productos.length} producto{productos.length !== 1 ? 's' : ''} a la venta
              </p>
              {tienda?.descripcion && (
                <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">
                  {tienda.descripcion}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-base font-black text-gray-800">Productos de la tienda</h2>
          </div>

          {productos.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-600 font-medium">Esta tienda aún no tiene productos activos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {productos.map((p) => (
                <a
                  key={p.id}
                  href={`/productos/${p.id}`}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition group"
                >
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    {p.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <span className="text-5xl">{ICONO_CATEGORIA[p.categoria] || '📦'}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.categoria} · {p.condicion}</p>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-base font-black text-orange-500">{fmt(p.precio)}</span>
                      {p.precio_oferta && (
                        <span className="text-xs text-gray-400 line-through">{fmt(p.precio_oferta)}</span>
                      )}
                    </div>
                    {p.stock <= 0 && (
                      <p className="text-[11px] text-red-500 font-bold mt-1">Agotado</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
