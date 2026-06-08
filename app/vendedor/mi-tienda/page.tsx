'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

type Tienda = {
  nombre: string
  descripcion: string
  logo_url: string
}

const EMPTY: Tienda = {
  nombre: '',
  descripcion: '',
  logo_url: '',
}

type Stats = {
  productosActivos: number
  productosTotal: number
  ventasCompletadas: number
  ingresos: number
  valoracion: number
  numResenas: number
}

const EMPTY_STATS: Stats = {
  productosActivos: 0,
  productosTotal: 0,
  ventasCompletadas: 0,
  ingresos: 0,
  valoracion: 0,
  numResenas: 0,
}

const ESTADOS_VENTA_COMPLETADA = ['entregado', 'liberado']

export default function MiTiendaPage() {
  const { user, loading: authLoading } = useAuth()

  const [tienda, setTienda]       = useState<Tienda>(EMPTY)
  const [stats, setStats]         = useState<Stats>(EMPTY_STATS)
  const [loading, setLoading]     = useState(true)
  const [editMode, setEditMode]   = useState(false)
  const [form, setForm]           = useState<Tienda>(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState(false)
  const [copiado, setCopiado]     = useState(false)

  useEffect(() => {
    if (!user) return
    let cancel = false

    const cargar = async () => {
      setLoading(true)
      setError('')

      const [tiendaRes, productosRes, pedidosRes] = await Promise.all([
        supabase
          .from('tiendas')
          .select('nombre, descripcion, logo_url')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('productos')
          .select('id, estado')
          .eq('vendedor_id', user.id),
        supabase
          .from('pedidos')
          .select('id, total, estado')
          .eq('vendedor_id', user.id),
      ])

      if (cancel) return

      const tiendaData: Tienda = {
        nombre:      tiendaRes.data?.nombre      ?? '',
        descripcion: tiendaRes.data?.descripcion ?? '',
        logo_url:    tiendaRes.data?.logo_url    ?? '',
      }
      setTienda(tiendaData)
      setForm(tiendaData)

      const productos = productosRes.data ?? []
      const pedidos   = pedidosRes.data   ?? []
      const completados = pedidos.filter((p) => ESTADOS_VENTA_COMPLETADA.includes(p.estado))

      setStats({
        productosActivos:  productos.filter((p) => p.estado === 'activo').length,
        productosTotal:    productos.length,
        ventasCompletadas: completados.length,
        ingresos:          completados.reduce((acc, p) => acc + (Number(p.total) || 0), 0),
        valoracion:        0,
        numResenas:        0,
      })

      setLoading(false)
    }

    cargar()
    return () => { cancel = true }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setGuardando(true)
    setError('')
    setExito(false)

    const { error: sbError } = await supabase
      .from('tiendas')
      .upsert(
        {
          id:          user.id,
          nombre:      form.nombre.trim()      || null,
          descripcion: form.descripcion.trim() || null,
          logo_url:    form.logo_url.trim()    || null,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: 'id' },
      )

    if (sbError) {
      setError('No se pudo guardar la tienda: ' + sbError.message)
    } else {
      setTienda(form)
      setEditMode(false)
      setExito(true)
      setTimeout(() => setExito(false), 4000)
    }
    setGuardando(false)
  }

  const handleCancelar = () => {
    setForm(tienda)
    setEditMode(false)
    setError('')
  }

  const handleCopiarLink = async () => {
    if (!user) return
    const url = `${window.location.origin}/tienda/${user.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      window.prompt('Copia el link de tu tienda:', url)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400 text-sm animate-pulse">Cargando tienda...</p>
      </div>
    )
  }

  if (!user) return null

  const nombreVisible = tienda.nombre || user.email?.split('@')[0] || 'Mi tienda'
  const inicial = (tienda.nombre || user.email || 'M')[0].toUpperCase()
  const publicUrl = `/tienda/${user.id}`

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Cabecera */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Mi tienda</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personaliza cómo te ven los compradores en Merkao.
          </p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
          >
            ✏️ Editar perfil de tienda
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}
      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
          ✅ Cambios guardados correctamente.
        </div>
      )}

      {/* Tarjeta principal: información de la tienda */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {!editMode ? (
          <div className="flex items-start gap-5 flex-wrap">
            {/* Logo */}
            <div className="shrink-0">
              {tienda.logo_url ? (
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

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-gray-900 leading-tight">{nombreVisible}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">
                {tienda.descripcion || (
                  <span className="text-gray-400 italic">
                    Aún no agregaste una descripción. Cuéntales a los compradores qué hace especial a tu tienda.
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGuardar} className="space-y-5">
            <h2 className="text-sm font-bold text-gray-700">Editar perfil de tienda</h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre de la tienda <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej. Tejidos Andinos del Cusco"
                required
                maxLength={80}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="¿Qué vendes? ¿Por qué deberían comprarte? Máx. 500 caracteres."
                maxLength={500}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {form.descripcion.length}/500 caracteres
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                URL del logo
              </label>
              <input
                type="url"
                name="logo_url"
                value={form.logo_url}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Pega la URL pública de tu logo (formato cuadrado recomendado).
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 py-3 rounded-xl font-black text-sm transition hover:brightness-110 disabled:opacity-60"
                style={{ backgroundColor: '#FF9900', color: '#131921' }}
              >
                {guardando ? 'Guardando...' : '💾 Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={handleCancelar}
                disabled={guardando}
                className="px-5 py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Link público a la tienda */}
      {!editMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3">🌐 Link público a tu tienda</h2>
          <p className="text-xs text-gray-500 mb-4">
            Comparte este link con tus clientes para que vean todos tus productos en un solo lugar.
          </p>
          <div className="flex gap-2 flex-wrap">
            <code className="flex-1 min-w-0 truncate bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-700">
              {typeof window !== 'undefined' ? `${window.location.origin}${publicUrl}` : publicUrl}
            </code>
            <button
              onClick={handleCopiarLink}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs transition shrink-0"
            >
              {copiado ? '✅ Copiado' : '📋 Copiar'}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shrink-0"
            >
              👁️ Ver tienda
            </a>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {!editMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-4">📊 Estadísticas básicas</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg mb-2">
                📦
              </div>
              <p className="text-2xl font-black text-gray-800">{stats.productosActivos}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Productos activos
                {stats.productosTotal !== stats.productosActivos && (
                  <span className="text-gray-400"> · {stats.productosTotal} total</span>
                )}
              </p>
            </div>

            <div className="bg-green-50 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-lg mb-2">
                🛒
              </div>
              <p className="text-2xl font-black text-gray-800">{stats.ventasCompletadas}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ventas completadas</p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg mb-2">
                💰
              </div>
              <p className="text-2xl font-black text-gray-800">
                S/ {stats.ingresos.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Ingresos acumulados</p>
            </div>

            <div className="bg-yellow-50 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center text-lg mb-2">
                ⭐
              </div>
              <p className="text-2xl font-black text-gray-800">
                {stats.numResenas > 0 ? stats.valoracion.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {stats.numResenas > 0
                  ? `Valoración (${stats.numResenas} reseñas)`
                  : 'Sin reseñas aún'}
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
