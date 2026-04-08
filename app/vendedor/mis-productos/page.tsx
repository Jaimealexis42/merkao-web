'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Producto = {
  id: string
  nombre: string
  precio: number
  precio_oferta: number | null
  categoria: string
  stock: number
  condicion: string
  estado: string
  created_at: string
}

const iconoCategoria: Record<string, string> = {
  'Ropa y Moda': '👗',
  'Electrónicos': '📱',
  'Alimentos': '🥗',
  'Artesanías': '🎨',
  'Hogar': '🛋️',
  'Autos y Motos': '🚗',
  'Agrícola': '🌾',
  'Salud y Belleza': '💄',
  'Deportes': '⚽',
  'Juguetes': '🧸',
  'Libros': '📚',
  'Otros': '📦',
}

export default function MisProductos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [eliminando, setEliminando] = useState<string | null>(null)

  const cargarProductos = async () => {
    setLoading(true)
    setError('')
    const { data, error: sbError } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false })

    if (sbError) {
      setError('No se pudieron cargar los productos.')
    } else {
      setProductos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  const toggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo'
    const { error: sbError } = await supabase
      .from('productos')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (!sbError) {
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      )
    }
  }

  const eliminarProducto = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return
    setEliminando(id)
    const { error: sbError } = await supabase.from('productos').delete().eq('id', id)
    if (!sbError) {
      setProductos((prev) => prev.filter((p) => p.id !== id))
    }
    setEliminando(null)
  }

  const productosFiltrados = productos.filter((p) =>
    filtro === 'todos' ? true : p.estado === filtro
  )

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Mis productos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {productos.length} producto{productos.length !== 1 ? 's' : ''} en tu tienda
          </p>
        </div>
        <a
          href="/vendedor/publicar"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
        >
          ➕ Publicar producto
        </a>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['todos', 'activo', 'inactivo'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition capitalize ${
              filtro === f
                ? 'border-orange-500 bg-orange-50 text-orange-600'
                : 'border-gray-100 text-gray-500 hover:border-gray-200 bg-white'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'activo' ? '✅ Activos' : '⏸️ Inactivos'}
            {f !== 'todos' && (
              <span className="ml-1.5 text-xs">
                ({productos.filter((p) => p.estado === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm animate-pulse">Cargando productos...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 flex items-center gap-2">
          <span>⚠️</span> {error}
          <button onClick={cargarProductos} className="ml-auto underline hover:no-underline text-xs">Reintentar</button>
        </div>
      )}

      {/* Lista vacía */}
      {!loading && !error && productosFiltrados.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-700 font-bold">
            {filtro === 'todos' ? 'Aún no tienes productos' : `No hay productos ${filtro}s`}
          </p>
          {filtro === 'todos' && (
            <a
              href="/vendedor/publicar"
              className="mt-4 inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
            >
              Publica tu primer producto
            </a>
          )}
        </div>
      )}

      {/* Grid de productos */}
      {!loading && !error && productosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {productosFiltrados.map((producto) => (
            <div
              key={producto.id}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition ${
                producto.estado === 'inactivo' ? 'opacity-60' : ''
              }`}
            >
              {/* Ícono de categoría */}
              <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                {iconoCategoria[producto.categoria] || '📦'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="font-bold text-gray-800 text-sm truncate">{producto.nombre}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                    producto.estado === 'activo'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {producto.estado === 'activo' ? '✅ Activo' : '⏸️ Inactivo'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{producto.categoria} · {producto.condicion}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-lg font-black text-orange-500">S/ {producto.precio.toFixed(2)}</span>
                  {producto.precio_oferta && (
                    <span className="text-xs text-gray-400 line-through">S/ {producto.precio_oferta.toFixed(2)}</span>
                  )}
                  <span className="text-xs text-gray-500">· Stock: {producto.stock}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleEstado(producto.id, producto.estado)}
                  title={producto.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-base transition"
                >
                  {producto.estado === 'activo' ? '⏸️' : '▶️'}
                </button>
                <a
                  href={`/vendedor/editar/${producto.id}`}
                  title="Editar"
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-base transition"
                >
                  ✏️
                </a>
                <button
                  onClick={() => eliminarProducto(producto.id)}
                  disabled={eliminando === producto.id}
                  title="Eliminar"
                  className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-base transition disabled:opacity-50"
                >
                  {eliminando === producto.id ? '⏳' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
