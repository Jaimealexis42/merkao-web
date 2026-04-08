'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

const CATEGORIAS_MAP: { nombre: string; id: number }[] = [
  { nombre: 'Ropa y Moda',    id: 1 },
  { nombre: 'Electrónicos',   id: 2 },
  { nombre: 'Alimentos',      id: 3 },
  { nombre: 'Artesanías',     id: 4 },
  { nombre: 'Hogar',          id: 5 },
  { nombre: 'Autos y Motos',  id: 6 },
  { nombre: 'Agrícola',       id: 7 },
  { nombre: 'Otros',          id: 8 },
  { nombre: 'Salud y Belleza', id: 9 },
  { nombre: 'Deportes',       id: 10 },
  { nombre: 'Juguetes',       id: 11 },
  { nombre: 'Libros',         id: 12 },
]

const CIUDADES_PERU = [
  'Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos',
  'Cusco', 'Huancayo', 'Tacna', 'Pucallpa', 'Cajamarca', 'Chimbote',
  'Ayacucho', 'Juliaca', 'Ica', 'Puno', 'Huánuco', 'Tarapoto',
]

export default function PublicarProducto() {
  const { user } = useAuth()

  const [form, setForm] = useState({
    nombre:                    '',
    descripcion:               '',
    precio:                    '',
    precio_oferta:             '',
    precio_mayoreo:            '',
    cantidad_minima_mayoreo:   '',
    costo_envio:               '0',
    ciudad:                    '',
    categoria:                 '',
    stock:                     '1',
    condicion:                 'nuevo',
  })
  const [loading, setLoading] = useState(false)
  const [exito, setExito]     = useState(false)
  const [error, setError]     = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setExito(false)

    const catObj = CATEGORIAS_MAP.find((c) => c.nombre === form.categoria)

    const { error: sbError } = await supabase.from('productos').insert([{
      nombre:                    form.nombre,
      descripcion:               form.descripcion,
      precio:                    parseFloat(form.precio),
      precio_oferta:             form.precio_oferta ? parseFloat(form.precio_oferta) : null,
      precio_mayoreo:            form.precio_mayoreo ? parseFloat(form.precio_mayoreo) : null,
      cantidad_minima_mayoreo:   form.cantidad_minima_mayoreo ? parseInt(form.cantidad_minima_mayoreo) : null,
      costo_envio:               parseFloat(form.costo_envio || '0'),
      ciudad:                    form.ciudad || null,
      categoria:                 form.categoria,
      categoria_id:              catObj?.id ?? null,
      stock:                     parseInt(form.stock),
      condicion:                 form.condicion,
      estado:                    'activo',
      vendedor_id:               user?.id ?? null,
    }])

    setLoading(false)

    if (sbError) {
      setError('Ocurrió un error al publicar el producto. Intenta de nuevo.')
    } else {
      setExito(true)
      setForm({
        nombre: '', descripcion: '', precio: '', precio_oferta: '',
        precio_mayoreo: '', cantidad_minima_mayoreo: '', costo_envio: '0',
        ciudad: '', categoria: '', stock: '1', condicion: 'nuevo',
      })
    }
  }

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-black text-gray-800">Publicar producto</h1>
        <p className="text-sm text-gray-500 mt-1">Completa los datos para poner tu producto a la venta en Merkao.</p>
      </div>

      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-bold">¡Producto publicado con éxito!</p>
            <p className="text-xs mt-0.5">Ya está visible en el marketplace.</p>
          </div>
          <a href="/vendedor/mis-productos" className="ml-auto text-xs font-bold text-green-700 underline hover:no-underline">
            Ver mis productos
          </a>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Información básica */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Información básica</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del producto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Chompa de alpaca hecha a mano"
              required
              maxLength={120}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
            />
            <p className="text-xs text-gray-400 mt-1">{form.nombre.length}/120 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Describe tu producto: materiales, medidas, colores disponibles, etc."
              required
              rows={4}
              maxLength={1000}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{form.descripcion.length}/1000 caracteres</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition bg-white"
              >
                <option value="">Selecciona una categoría</option>
                {CATEGORIAS_MAP.map((cat) => (
                  <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <select
                name="ciudad"
                value={form.ciudad}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition bg-white"
              >
                <option value="">Selecciona ciudad</option>
                {CIUDADES_PERU.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
              <div className="flex gap-2">
                {['nuevo', 'usado'].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setForm({ ...form, condicion: op })}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition capitalize ${
                      form.condicion === op
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {op === 'nuevo' ? '✨ Nuevo' : '🔄 Usado'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Precio y stock */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Precio y stock</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio unitario (S/) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">S/</span>
                <input
                  type="number"
                  name="precio"
                  value={form.precio}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de oferta (S/)
                <span className="ml-1 text-xs text-gray-400">opcional</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">S/</span>
                <input
                  type="number"
                  name="precio_oferta"
                  value={form.precio_oferta}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock disponible <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>
          </div>
        </div>

        {/* Venta al por mayor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-1">Venta al por mayor</h2>
            <p className="text-xs text-gray-400">Opcional. Si el comprador pide la cantidad mínima o más, se aplica el precio mayoreo automáticamente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio mayoreo (S/)
                <span className="ml-1 text-xs text-gray-400">opcional</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">S/</span>
                <input
                  type="number"
                  name="precio_mayoreo"
                  value={form.precio_mayoreo}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad mínima para mayoreo
                <span className="ml-1 text-xs text-gray-400">unidades</span>
              </label>
              <input
                type="number"
                name="cantidad_minima_mayoreo"
                value={form.cantidad_minima_mayoreo}
                onChange={handleChange}
                placeholder="Ej: 10"
                min="2"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>
          </div>

          {form.precio && form.precio_mayoreo && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700">
              📦 Comprando {form.cantidad_minima_mayoreo || '?'}+ unidades pagarán <strong>S/ {form.precio_mayoreo}</strong> c/u en vez de <strong>S/ {form.precio}</strong>
            </div>
          )}
        </div>

        {/* Costo de envío */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-1">Costo de envío (flete)</h2>
            <p className="text-xs text-gray-400">Ingresa el costo fijo de envío. Déjalo en 0 si prefieres acordarlo con el comprador.</p>
          </div>

          <div className="max-w-xs">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">S/</span>
              <input
                type="number"
                name="costo_envio"
                value={form.costo_envio}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>
            {parseFloat(form.costo_envio || '0') === 0 ? (
              <p className="text-xs text-blue-600 mt-1">🚚 Se mostrará como "Flete a acordar con comprador"</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">🚚 El comprador verá el costo de envío de S/ {form.costo_envio}</p>
            )}
          </div>
        </div>

        {/* Nota de fotos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Fotos del producto</h2>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-3xl mb-2">📷</p>
            <p className="text-sm font-medium text-gray-600">Carga de fotos próximamente</p>
            <p className="text-xs text-gray-400 mt-1">Por ahora se mostrará un ícono según la categoría</p>
          </div>
        </div>

        {/* Botón de envío */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition disabled:opacity-60 text-sm"
          >
            {loading ? 'Publicando...' : '🚀 Publicar producto'}
          </button>
          <a href="/vendedor" className="text-sm text-gray-400 hover:text-gray-600 transition">
            Cancelar
          </a>
        </div>

      </form>
    </div>
  )
}
