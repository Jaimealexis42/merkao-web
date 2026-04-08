'use client'
import { useCarritoStore } from '@/src/store/carritoStore'
import { fmt } from '@/lib/precios'

const IGV_TASA = 0.18

export default function CarritoPage() {
  const items          = useCarritoStore((s) => s.items)
  const cambiarCantidad = useCarritoStore((s) => s.cambiarCantidad)
  const quitarItem     = useCarritoStore((s) => s.quitarItem)
  const vaciarCarrito  = useCarritoStore((s) => s.vaciarCarrito)
  const totalItems     = useCarritoStore((s) => s.totalItems)
  const totalPrecio    = useCarritoStore((s) => s.totalPrecio)

  // Los precios ya vienen con IGV incluido desde el detalle de producto.
  // Descomponemos para el resumen.
  const totalConIGV  = totalPrecio()
  const subtotalBase = +(totalConIGV / (1 + IGV_TASA)).toFixed(2)
  const montoIGV     = +(totalConIGV - subtotalBase).toFixed(2)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EAEDED', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-4" style={{ backgroundColor: '#131921' }}>
        <a href="/" className="flex items-center gap-0.5 border-2 border-transparent hover:border-white rounded px-1 py-1 transition">
          <span className="text-white text-xl font-black tracking-tight">merkao</span>
          <span className="text-xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>
        <h1 className="text-white font-bold text-base flex items-center gap-2">
          🛒 Tu carrito
          {totalItems() > 0 && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full text-gray-900" style={{ backgroundColor: '#FF9900' }}>
              {totalItems()}
            </span>
          )}
        </h1>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Carrito vacío ── */}
        {items.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <p className="text-6xl mb-4">🛒</p>
            <p className="text-xl font-black text-gray-800 mb-2">Tu carrito está vacío</p>
            <p className="text-sm text-gray-500 mb-6">Explora el marketplace y agrega productos que te interesen.</p>
            <a
              href="/"
              className="inline-block font-bold px-8 py-3 rounded-xl text-gray-900 text-sm transition hover:brightness-95"
              style={{ backgroundColor: '#FF9900' }}
            >
              Volver al inicio
            </a>
          </div>
        )}

        {/* ── Carrito con items ── */}
        {items.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* ── Lista de items ── */}
            <div className="flex-1 space-y-3 min-w-0">

              {/* Cabecera lista */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-3 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">
                  {items.length} producto{items.length !== 1 ? 's' : ''} en tu carrito
                </p>
                <button
                  onClick={vaciarCarrito}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline transition font-medium"
                >
                  Vaciar carrito
                </button>
              </div>

              {/* Items */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex gap-4 items-start"
                >
                  {/* Imagen */}
                  <a href={`/productos/${item.id}`} className="shrink-0">
                    <div className="w-24 h-24 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                      {item.imagen ? (
                        <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">📦</span>
                      )}
                    </div>
                  </a>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <a
                      href={`/productos/${item.id}`}
                      className="text-sm font-bold text-gray-800 hover:text-orange-600 transition line-clamp-2 block"
                    >
                      {item.nombre}
                    </a>
                    <p className="text-xs text-gray-400">Vendedor: {item.vendedor}</p>
                    <p className="text-xs text-green-600 font-medium">✅ En stock</p>

                    {/* Precio unitario */}
                    <p className="text-base font-black" style={{ color: '#B12704' }}>
                      {fmt(item.precio)}
                      <span className="text-xs font-normal text-gray-400 ml-1">c/u (con IGV)</span>
                    </p>

                    {/* Controles */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">

                      {/* Selector de cantidad */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition font-bold text-lg"
                          aria-label="Reducir cantidad"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-black text-gray-900">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition font-bold text-lg"
                          aria-label="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal por item */}
                      <span className="text-sm font-bold text-gray-700">
                        = {fmt(item.precio * item.cantidad)}
                      </span>

                      {/* Eliminar */}
                      <button
                        onClick={() => quitarItem(item.id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline transition ml-auto"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Resumen lateral ── */}
            <div className="w-full lg:w-80 shrink-0 space-y-3 lg:sticky lg:top-20">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
                <h2 className="text-base font-black text-gray-800">Resumen del pedido</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal sin IGV</span>
                    <span>{fmt(subtotalBase)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IGV (18%)</span>
                    <span>{fmt(montoIGV)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Envío</span>
                    <span className="text-blue-600 font-medium">A coordinar</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                  <span className="font-black text-gray-800">Total</span>
                  <span className="text-2xl font-black" style={{ color: '#B12704' }}>
                    {fmt(totalConIGV)}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 text-center">
                  IGV incluido · Precios en Soles peruanos (S/)
                </p>

                {/* Botón pago */}
                <button
                  disabled
                  title="Función en desarrollo"
                  className="w-full py-3.5 rounded-xl font-black text-sm text-gray-500 bg-gray-100 cursor-not-allowed border-2 border-dashed border-gray-200"
                >
                  🔒 Proceder al pago
                  <span className="block text-[10px] font-normal mt-0.5 text-gray-400">Próximamente</span>
                </button>

                {/* Seguir comprando */}
                <a
                  href="/"
                  className="block w-full py-3 rounded-xl font-bold text-sm text-center transition hover:brightness-95 text-gray-900"
                  style={{ backgroundColor: '#FF9900' }}
                >
                  ← Seguir comprando
                </a>
              </div>

              {/* Garantías */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-2">
                {[
                  { icono: '🔒', texto: 'Pago 100% seguro' },
                  { icono: '✅', texto: 'Compra protegida por Merkao' },
                  { icono: '🔄', texto: 'Cambios y devoluciones' },
                ].map(({ icono, texto }) => (
                  <div key={texto} className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{icono}</span>
                    <span>{texto}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
