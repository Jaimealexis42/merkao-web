export default function VendedorDashboard() {
  const stats = [
    { label: 'Productos activos', valor: '12', icono: '📦', color: 'bg-blue-50 text-blue-600' },
    { label: 'Ventas este mes', valor: '34', icono: '🛒', color: 'bg-green-50 text-green-600' },
    { label: 'Visitas hoy', valor: '128', icono: '👁️', color: 'bg-purple-50 text-purple-600' },
    { label: 'Ingresos del mes', valor: 'S/ 1,240', icono: '💰', color: 'bg-orange-50 text-orange-600' },
  ]

  const pedidosRecientes = [
    { id: '#4521', producto: 'Chompa de alpaca', comprador: 'María G.', monto: 'S/ 85.00', estado: 'Pendiente', fecha: 'Hoy, 10:32' },
    { id: '#4520', producto: 'Vestido casual', comprador: 'Ana R.', monto: 'S/ 55.00', estado: 'Enviado', fecha: 'Ayer, 15:10' },
    { id: '#4519', producto: 'Manta andina', comprador: 'Luis M.', monto: 'S/ 110.00', estado: 'Entregado', fecha: '29 mar' },
    { id: '#4518', producto: 'Chompa de alpaca', comprador: 'Carlos T.', monto: 'S/ 85.00', estado: 'Entregado', fecha: '28 mar' },
  ]

  const estadoColor: Record<string, string> = {
    Pendiente: 'bg-yellow-100 text-yellow-700',
    Enviado: 'bg-blue-100 text-blue-700',
    Entregado: 'bg-green-100 text-green-700',
    Cancelado: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-black text-gray-800">Panel de vendedor</h1>
        <p className="text-sm text-gray-500 mt-1">Bienvenido de vuelta. Aquí está el resumen de tu tienda.</p>
      </div>

      {/* Beneficio principal: Sin comisiones */}
      <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
        <div className="text-3xl shrink-0">✅</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-base">Sin comisiones — recibes el 100% de tu precio</p>
          <p className="text-emerald-50 text-xs mt-0.5 leading-relaxed">
            Merkao cobra una tarifa de servicio del 3% al comprador. El precio que publicas es exactamente lo que ingresas por venta.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-black tracking-widest bg-white/15 border border-white/30 rounded-full px-2.5 py-1 text-white">
          🚀 LANZAMIENTO
        </span>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${stat.color}`}>
              {stat.icono}
            </div>
            <p className="text-2xl font-black text-gray-800">{stat.valor}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/vendedor/publicar"
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
          >
            ➕ Publicar producto
          </a>
          <a
            href="/vendedor/mis-productos"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-xl transition"
          >
            📦 Ver mis productos
          </a>
          <a
            href="/vendedor/pedidos"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-xl transition"
          >
            🚚 Ver pedidos
          </a>
        </div>
      </div>

      {/* Pedidos recientes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Pedidos recientes</h2>
          <a href="/vendedor/pedidos" className="text-xs text-orange-500 hover:underline font-medium">
            Ver todos →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Pedido</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Comprador</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pedidosRecientes.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5 font-medium text-gray-800">{pedido.id}</td>
                  <td className="px-5 py-3.5 text-gray-600">{pedido.producto}</td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{pedido.comprador}</td>
                  <td className="px-5 py-3.5 font-bold text-gray-800">{pedido.monto}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${estadoColor[pedido.estado]}`}>
                      {pedido.estado}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 hidden md:table-cell">{pedido.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consejos */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-orange-800 mb-3">💡 Consejos para vender más</h2>
        <ul className="space-y-2 text-xs text-orange-700">
          <li>• Sube fotos de calidad — los productos con fotos reales reciben 3x más visitas.</li>
          <li>• Responde mensajes en menos de 1 hora para mejorar tu reputación.</li>
          <li>• Ofrece envío por Olva Courier o Shalom para llegar a todo el Perú.</li>
        </ul>
      </div>

    </div>
  )
}
