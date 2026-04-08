export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">

      {/* NAVBAR */}
      <nav className="bg-orange-500 text-white px-4 py-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tight">Merkao</h1>
          <div className="flex-1 flex items-center bg-white rounded-lg overflow-hidden">
            <input
              type="text"
              placeholder="Busca productos, marcas y más..."
              className="flex-1 px-4 py-2 text-gray-800 text-sm outline-none"
            />
            <button className="bg-orange-400 hover:bg-orange-600 px-4 py-2 text-white font-bold text-sm transition">
              🔍
            </button>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            <a href="/login" className="hover:underline">Ingresar</a>
            <a href="/register" className="bg-white text-orange-500 px-3 py-1 rounded font-bold hover:bg-orange-50 transition">Registrarse</a>
            <a href="/vender" className="hover:underline">Vende en Merkao</a>
            <a href="/carrito" className="relative">
              🛒 <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">0</span>
            </a>
          </div>
        </div>
      </nav>

      {/* CATEGORIAS */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-6 overflow-x-auto text-sm font-medium text-gray-700">
          {[
            { icono: '👗', nombre: 'Ropa y Moda' },
            { icono: '📱', nombre: 'Electrónicos' },
            { icono: '🥗', nombre: 'Alimentos' },
            { icono: '🎨', nombre: 'Artesanías' },
            { icono: '🛋️', nombre: 'Hogar' },
            { icono: '🚗', nombre: 'Autos y Motos' },
            { icono: '🌾', nombre: 'Agrícola' },
          ].map((cat) => (
            <a
              key={cat.nombre}
              href={`/categoria/${cat.nombre.toLowerCase()}`}
              className="flex flex-col items-center gap-1 min-w-fit hover:text-orange-500 transition cursor-pointer"
            >
              <span className="text-2xl">{cat.icono}</span>
              <span className="whitespace-nowrap">{cat.nombre}</span>
            </a>
          ))}
        </div>
      </div>

      {/* BANNER HERO */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-8 text-white flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black mb-2">Compra y vende en Perú 🇵🇪</h2>
            <p className="text-orange-100 mb-4">Millones de productos de vendedores peruanos. Paga con Yape, tarjeta o Plin.</p>
            <div className="flex gap-3">
              <a href="/productos" className="bg-white text-orange-500 font-bold px-5 py-2 rounded-lg hover:bg-orange-50 transition">
                Ver productos
              </a>
              <a href="/vender" className="border-2 border-white text-white font-bold px-5 py-2 rounded-lg hover:bg-orange-400 transition">
                Empieza a vender
              </a>
            </div>
          </div>
          <div className="hidden md:block text-8xl">🛍️</div>
        </div>
      </div>

      {/* PRODUCTOS DESTACADOS */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Productos destacados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { nombre: 'Chompa de alpaca', precio: 'S/ 85.00', vendedor: 'ArtesaníasPeru', img: '🧥', categoria: 'Artesanías' },
            { nombre: 'iPhone 13 128GB', precio: 'S/ 1,850.00', vendedor: 'TechLima', img: '📱', categoria: 'Electrónicos' },
            { nombre: 'Mango del norte', precio: 'S/ 15.00', vendedor: 'FincaChiclayo', img: '🥭', categoria: 'Agrícola' },
            { nombre: 'Silla gamer', precio: 'S/ 320.00', vendedor: 'GamerPeru', img: '🪑', categoria: 'Hogar' },
            { nombre: 'Vestido casual', precio: 'S/ 55.00', vendedor: 'ModaLima', img: '👗', categoria: 'Ropa' },
            { nombre: 'Laptop HP 15"', precio: 'S/ 2,100.00', vendedor: 'TechStore', img: '💻', categoria: 'Electrónicos' },
            { nombre: 'Cacao orgánico 1kg', precio: 'S/ 28.00', vendedor: 'OrganicPeru', img: '🍫', categoria: 'Alimentos' },
            { nombre: 'Cuadro shipibo', precio: 'S/ 120.00', vendedor: 'ArteAmazónico', img: '🎨', categoria: 'Artesanías' },
            { nombre: 'Zapatillas Nike', precio: 'S/ 280.00', vendedor: 'ShoesLima', img: '👟', categoria: 'Ropa' },
            { nombre: 'Smart TV 43"', precio: 'S/ 890.00', vendedor: 'ElectrosPeru', img: '📺', categoria: 'Electrónicos' },
          ].map((prod) => (
            <div key={prod.nombre} className="bg-white rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 h-36 flex items-center justify-center text-5xl">
                {prod.img}
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-400 mb-1">{prod.categoria}</p>
                <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">{prod.nombre}</p>
                <p className="text-lg font-black text-orange-500">{prod.precio}</p>
                <p className="text-xs text-gray-400 mt-1">por {prod.vendedor}</p>
                <button className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 rounded-lg transition">
                  Agregar al carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BANNER VENDE */}
      <div className="bg-orange-50 border-t border-orange-100 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-black text-gray-800 mb-2">¿Tienes algo que vender?</h3>
          <p className="text-gray-500 mb-6">Publica gratis tus primeros 3 meses. Sin comisiones al inicio.</p>
          <a href="/vender" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl text-lg transition inline-block">
            Empieza a vender gratis →
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-gray-300 py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <h4 className="text-white font-bold mb-3">Merkao</h4>
            <p className="text-gray-400">El marketplace peruano. Compra y vende con confianza.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">Comprar</h4>
            <ul className="space-y-1 text-gray-400">
              <li><a href="#" className="hover:text-white">Cómo comprar</a></li>
              <li><a href="#" className="hover:text-white">Formas de pago</a></li>
              <li><a href="#" className="hover:text-white">Envíos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">Vender</h4>
            <ul className="space-y-1 text-gray-400">
              <li><a href="#" className="hover:text-white">Cómo vender</a></li>
              <li><a href="#" className="hover:text-white">Comisiones</a></li>
              <li><a href="#" className="hover:text-white">Centro de vendedores</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">Ayuda</h4>
            <ul className="space-y-1 text-gray-400">
              <li><a href="#" className="hover:text-white">Centro de ayuda</a></li>
              <li><a href="#" className="hover:text-white">Contáctanos</a></li>
              <li><a href="#" className="hover:text-white">Términos y condiciones</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-gray-700 text-center text-gray-500 text-xs">
          © 2026 Merkao — Hecho en Perú 🇵🇪
        </div>
      </footer>

    </main>
  )
}
