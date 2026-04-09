'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt, ARANCELES } from '@/lib/precios'
import { useAuth } from '@/lib/useAuth'
import { T, CAT_NAMES, type Lang } from '@/lib/translations'
import { useCarritoStore } from '@/src/store/carritoStore'

/* ─────────────────────────── CONSTANTES ─────────────────────────── */

const DEPARTAMENTOS_PERU = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
  'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
  'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna',
  'Tumbes', 'Ucayali',
]

const CATEGORIAS = [
  { id: 0, icono: '🏠' },
  { id: 1, icono: '👗' },
  { id: 2, icono: '📱' },
  { id: 3, icono: '🥗' },
  { id: 4, icono: '🎨' },
  { id: 5, icono: '🛋️' },
  { id: 6, icono: '🚗' },
  { id: 7, icono: '🌾' },
  { id: 8, icono: '📦' },
]

const CAT_SLUG: Record<number, string> = {
  1: 'ropa-y-moda',
  2: 'electronicos',
  3: 'alimentos',
  4: 'artesanias',
  5: 'hogar',
  6: 'autos-y-motos',
  7: 'agricola',
  8: 'otros',
}

type BannerLang = Record<Lang, string>
type Banner = {
  titulo: BannerLang; subtitulo: BannerLang; cta: BannerLang; bg: string
  badge: BannerLang; emoji: string
}

const BANNERS: Banner[] = [
  {
    titulo:    { es: 'Mega Oferta en Electrónicos',       en: 'Electronics Mega Sale',             pt: 'Mega Oferta em Eletrônicos' },
    subtitulo: { es: 'Hasta 40% de descuento en laptops, celulares y más', en: 'Up to 40% off laptops, phones and more', pt: 'Até 40% de desconto em laptops e celulares' },
    cta:       { es: 'Ver ofertas',     en: 'See deals',      pt: 'Ver ofertas' },
    bg: 'from-[#131921] via-[#1a2a3a] to-[#0f3460]',
    badge:     { es: '🔥 OFERTA DEL DÍA', en: '🔥 DAILY DEAL',   pt: '🔥 OFERTA DO DIA' },
    emoji: '💻',
  },
  {
    titulo:    { es: 'Moda Peruana para todos',           en: 'Peruvian Fashion for Everyone',     pt: 'Moda Peruana para Todos' },
    subtitulo: { es: 'Las mejores marcas y diseñadores peruanos', en: 'The best Peruvian brands and designers', pt: 'As melhores marcas e designers peruanos' },
    cta:       { es: 'Explorar moda',   en: 'Explore fashion', pt: 'Explorar moda' },
    bg: 'from-[#4a0080] via-[#6b0fa0] to-[#8b1cc8]',
    badge:     { es: '✨ NUEVO',         en: '✨ NEW',           pt: '✨ NOVO' },
    emoji: '👗',
  },
  {
    titulo:    { es: 'Alimentos Orgánicos del Perú',      en: 'Organic Foods from Peru',           pt: 'Alimentos Orgânicos do Peru' },
    subtitulo: { es: 'Directo del campo a tu mesa. Quinua, cacao, café y más', en: 'From farm to your table. Quinoa, cacao, coffee and more', pt: 'Direto do campo à sua mesa. Quinoa, cacau, café e mais' },
    cta:       { es: 'Comprar ahora',   en: 'Shop now',        pt: 'Comprar agora' },
    bg: 'from-[#1a4a1a] via-[#2d6a2d] to-[#3d8b3d]',
    badge:     { es: '🌱 ORGÁNICO',     en: '🌱 ORGANIC',      pt: '🌱 ORGÂNICO' },
    emoji: '🥭',
  },
  {
    titulo:    { es: 'Artesanías Únicas del Perú',        en: 'Unique Peruvian Crafts',            pt: 'Artesanato Único do Peru' },
    subtitulo: { es: 'Tejidos, cerámicas y arte hecho a mano por artesanos peruanos', en: 'Weavings, ceramics and handmade art by Peruvian artisans', pt: 'Tecidos, cerâmicas e arte feita à mão por artesãos peruanos' },
    cta:       { es: 'Ver artesanías',  en: 'See crafts',      pt: 'Ver artesanato' },
    bg: 'from-[#7a2500] via-[#a33500] to-[#c94a00]',
    badge:     { es: '🇵🇪 HECHO EN PERÚ', en: '🇵🇪 MADE IN PERU', pt: '🇵🇪 FEITO NO PERU' },
    emoji: '🎨',
  },
  {
    titulo:    { es: 'Equipos Agrícolas al Mejor Precio', en: 'Farm Equipment at Best Price',      pt: 'Equipamentos Agrícolas no Melhor Preço' },
    subtitulo: { es: 'Tractores, herramientas y semillas para el campo peruano', en: 'Tractors, tools and seeds for the Peruvian farm', pt: 'Tratores, ferramentas e sementes para o campo peruano' },
    cta:       { es: 'Ver equipos',     en: 'See equipment',   pt: 'Ver equipamentos' },
    bg: 'from-[#004d40] via-[#00695c] to-[#00897b]',
    badge:     { es: '🚜 PARA EL CAMPO', en: '🚜 FOR THE FARM',  pt: '🚜 PARA O CAMPO' },
    emoji: '🌾',
  },
]

/* ─────────────────────────── TIPOS ─────────────────────────── */

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

/* ─────────────────────────── HELPERS ─────────────────────────── */

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
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-[#FFA41C]' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-44 w-full" />
      <div className="p-3 space-y-2">
        <div className="bg-gray-200 h-3 rounded w-full" />
        <div className="bg-gray-200 h-3 rounded w-2/3" />
        <div className="bg-gray-200 h-4 rounded w-1/2" />
        <div className="bg-gray-200 h-3 rounded w-full" />
        <div className="bg-gray-200 h-3 rounded w-3/4" />
        <div className="bg-gray-200 h-8 rounded w-full mt-1" />
      </div>
    </div>
  )
}

/* ─────────────────────────── PÁGINA ─────────────────────────── */

export default function Home() {
  const [bannerActual, setBannerActual]       = useState(0)
  const [busqueda, setBusqueda]               = useState('')
  const [categoriaSearch, setCategoriaSearch] = useState(0)
  const [categoriaFiltro, setCategoriaFiltro] = useState(0)
  const [ciudadFiltro, setCiudadFiltro]       = useState('')
  const totalItems = useCarritoStore((s) => s.totalItems)
  const [agregarAnim, setAgregarAnim]         = useState<string | null>(null)
  const [productos, setProductos]             = useState<Producto[]>([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState('')
  const [pais, setPais]                       = useState('PE')
  const [lang, setLang]                       = useState<Lang>('es')

  const { user } = useAuth()
  const tr       = T[lang]
  const catNames = CAT_NAMES[lang]

  // ── Cargar idioma persistido ──
  useEffect(() => {
    const saved = localStorage.getItem('merkao_lang') as Lang | null
    if (saved && ['es', 'en', 'pt'].includes(saved)) setLang(saved)
  }, [])

  const cambiarIdioma = (l: Lang) => {
    setLang(l)
    localStorage.setItem('merkao_lang', l)
  }

  // ── Detectar país ──
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((d) => { if (d?.country_code) setPais(d.country_code) })
      .catch(() => {})
  }, [])

  // ── Carousel ──
  const siguiente = useCallback(() => setBannerActual((p) => (p + 1) % BANNERS.length), [])
  const anterior  = useCallback(() => setBannerActual((p) => (p - 1 + BANNERS.length) % BANNERS.length), [])
  useEffect(() => {
    const t = setInterval(siguiente, 4500)
    return () => clearInterval(t)
  }, [siguiente])

  // ── Cargar productos ──
  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError('')
      let q = supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, stock, categoria_id, imagenes, estado, ciudad, vistas')
        .eq('estado', 'activo')
        .order('vistas', { ascending: false })
      if (categoriaFiltro !== 0) q = q.eq('categoria_id', categoriaFiltro)
      if (ciudadFiltro)          q = q.eq('ciudad', ciudadFiltro)
      const { data, error: e } = await q
      if (e) setError('No se pudieron cargar los productos.')
      else setProductos(data || [])
      setLoading(false)
    }
    cargar()
  }, [categoriaFiltro, ciudadFiltro])

  const agregarAlCarrito = (id: string) => {
    setAgregarAnim(id)
    setTimeout(() => setAgregarAnim(null), 700)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const productosFiltrados = busqueda.trim()
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos

  const arancelInfo = ARANCELES[pais]
  const userLabel   = user?.email ? user.email.split('@')[0] : null

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ══════════════════ HEADER ══════════════════ */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#131921' }}>
        <div className="px-4 py-2.5 flex items-center gap-3">

          {/* Logo */}
          <a href="/" className="shrink-0 flex items-center gap-0.5 border-2 border-transparent hover:border-white rounded px-1 py-1 transition">
            <span className="text-white text-2xl font-black tracking-tight">merkao</span>
            <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
          </a>

          {/* País detectado */}
          <div className="hidden lg:flex flex-col shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 cursor-pointer transition">
            <span className="text-gray-400 text-[11px]">{tr.delivering_from}</span>
            <span className="text-white text-xs font-bold">
              {arancelInfo ? `${arancelInfo.bandera} ${arancelInfo.pais}` : '🇵🇪 Perú'}
            </span>
          </div>

          {/* Barra de búsqueda */}
          <div className="flex-1 flex rounded-lg overflow-hidden h-10 max-w-3xl">
            <select
              value={categoriaSearch}
              onChange={(e) => setCategoriaSearch(Number(e.target.value))}
              className="hidden md:block bg-gray-100 text-gray-700 text-xs px-2 border-r border-gray-300 outline-none cursor-pointer shrink-0 max-w-[130px]"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>{catNames[c.id]}</option>
              ))}
            </select>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={tr.search_placeholder}
              className="flex-1 px-4 text-sm text-gray-800 outline-none"
            />
            <button className="px-4 flex items-center justify-center hover:brightness-110 transition shrink-0" style={{ backgroundColor: '#FF9900' }}>
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Selector de país */}
          <select
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            className="hidden xl:block text-xs px-2 py-1 rounded border-2 border-gray-600 bg-transparent text-white outline-none cursor-pointer"
            title="Cambiar país"
          >
            <option value="PE">🇵🇪 Perú</option>
            {Object.entries(ARANCELES).map(([code, info]) => (
              <option key={code} value={code}>{info.bandera} {info.pais}</option>
            ))}
          </select>

          {/* Selector de idioma */}
          <div className="hidden sm:flex items-center border-2 border-gray-600 rounded overflow-hidden">
            {(['es', 'en', 'pt'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => cambiarIdioma(l)}
                className={`text-[11px] font-black px-2 py-1.5 transition ${lang === l ? 'text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}
                style={lang === l ? { backgroundColor: '#FF9900' } : {}}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Cuenta */}
          {userLabel ? (
            <div className="hidden sm:flex flex-col shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 transition cursor-pointer group relative">
              <span className="text-gray-400 text-[11px]">{tr.hello_user} {userLabel}</span>
              <span className="text-white text-xs font-bold">{tr.account}</span>
              <div className="absolute top-full right-0 bg-white shadow-lg rounded-xl py-2 hidden group-hover:block min-w-[150px] z-50 border border-gray-100">
                <a href="/perfil" className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">👤 Mi perfil</a>
                <a href="/vendedor" className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">🏪 {tr.vendor_panel}</a>
                <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">🚪 {tr.sign_out}</button>
              </div>
            </div>
          ) : (
            <a href="/login" className="hidden sm:flex flex-col shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 transition">
              <span className="text-gray-400 text-[11px]">{tr.hello_sign_in}</span>
              <span className="text-white text-xs font-bold">{tr.account}</span>
            </a>
          )}

          {/* Pedidos */}
          <a href="/pedidos" className="hidden lg:flex flex-col shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 transition">
            <span className="text-gray-400 text-[11px]">{tr.my_orders_label}</span>
            <span className="text-white text-xs font-bold">{tr.my_orders}</span>
          </a>

          {/* Carrito */}
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
            <span className="text-white text-xs font-bold hidden sm:inline pb-1">{tr.cart}</span>
          </a>
        </div>

        {/* Aviso de arancel */}
        {arancelInfo && (
          <div className="bg-amber-500 text-amber-950 text-xs font-bold py-1.5 px-4 text-center">
            {arancelInfo.bandera} {tr.delivering_from} <strong>{arancelInfo.pais}</strong> — Arancel de importación: <strong>{Math.round(arancelInfo.tasa * 100)}%</strong>
            <button onClick={() => setPais('PE')} className="ml-3 underline hover:no-underline opacity-70">{tr.change_to_peru}</button>
          </div>
        )}

        {/* Barra de categorías */}
        <div style={{ backgroundColor: '#232f3e' }}>
          <div className="px-4 flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            <button className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded hover:bg-white/10 transition shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {tr.all}
            </button>
            <button onClick={() => setCategoriaFiltro(0)} className="text-xs font-bold px-3 py-2 rounded hover:bg-white/10 transition shrink-0 whitespace-nowrap" style={{ color: '#FF9900' }}>
              {tr.daily_deals}
            </button>
            {CATEGORIAS.slice(1).map((cat) => (
              <a
                key={cat.id}
                href={`/categorias/${CAT_SLUG[cat.id]}`}
                className="text-gray-300 text-xs px-3 py-2 rounded hover:bg-white/10 transition shrink-0 whitespace-nowrap"
              >
                {cat.icono} {catNames[cat.id]}
              </a>
            ))}
            <a href="/vendedor" className="text-gray-300 text-xs px-3 py-2 rounded hover:bg-white/10 transition shrink-0 whitespace-nowrap ml-auto">
              {tr.sell_on_merkao}
            </a>
          </div>
        </div>
      </header>

      {/* ══════════════════ HERO CAROUSEL ══════════════════ */}
      <div className="relative overflow-hidden" style={{ height: '400px' }}>
        {BANNERS.map((banner, i) => (
          <div key={i} className={`absolute inset-0 bg-gradient-to-r ${banner.bg} transition-opacity duration-700 ${i === bannerActual ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <div className="max-w-screen-xl mx-auto px-8 h-full flex items-center justify-between">
              <div className="max-w-xl">
                <span className="inline-block text-xs font-black tracking-widest mb-3 px-3 py-1 rounded-full" style={{ backgroundColor: '#FF9900', color: '#131921' }}>
                  {banner.badge[lang]}
                </span>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-3">{banner.titulo[lang]}</h2>
                <p className="text-white/80 text-base mb-6">{banner.subtitulo[lang]}</p>
                <button
                  onClick={() => { setCategoriaFiltro(i + 1); window.scrollTo({ top: 600, behavior: 'smooth' }) }}
                  className="inline-block font-bold px-7 py-3 rounded-lg text-sm transition hover:brightness-110"
                  style={{ backgroundColor: '#FF9900', color: '#131921' }}
                >
                  {banner.cta[lang]} →
                </button>
              </div>
              <div className="hidden md:flex text-9xl select-none">{banner.emoji}</div>
            </div>
          </div>
        ))}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/30 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/30 to-transparent z-20 pointer-events-none" />
        <button onClick={anterior} className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-16 bg-white/90 hover:bg-white rounded flex items-center justify-center text-2xl shadow transition">‹</button>
        <button onClick={siguiente} className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-16 bg-white/90 hover:bg-white rounded flex items-center justify-center text-2xl shadow transition">›</button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => setBannerActual(i)} className={`rounded-full transition-all ${i === bannerActual ? 'w-6 h-2.5 bg-[#FF9900]' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'}`} />
          ))}
        </div>
      </div>

      {/* ══════════════════ CONTENIDO ══════════════════ */}
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-8">

        {/* Categorías rápidas */}
        <section className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">{tr.buy_by_category}</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {CATEGORIAS.slice(1).map((cat) => (
              <a
                key={cat.id}
                href={`/categorias/${CAT_SLUG[cat.id]}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition group hover:bg-orange-50"
              >
                <span className="text-3xl">{cat.icono}</span>
                <span className="text-xs text-center font-medium leading-tight text-gray-600 group-hover:text-orange-600">
                  {catNames[cat.id]}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Filtro por departamento */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-gray-500 shrink-0">📍 {tr.filter_by_city}:</span>
          <button
            onClick={() => setCiudadFiltro('')}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition font-medium ${!ciudadFiltro ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-600 hover:border-orange-400 bg-white'}`}
          >
            {tr.all_cities}
          </button>
          {DEPARTAMENTOS_PERU.map((dep) => (
            <button
              key={dep}
              onClick={() => setCiudadFiltro(dep === ciudadFiltro ? '' : dep)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap font-medium ${ciudadFiltro === dep ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-600 hover:border-orange-400 bg-white'}`}
            >
              {dep}
            </button>
          ))}
        </div>

        {/* Explicación escrow */}
        <section className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap gap-4 items-center">
          <div className="text-3xl">🔒</div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-bold text-blue-800">{tr.escrow_title}</p>
            <p className="text-xs text-blue-600 mt-0.5">{tr.escrow_desc}</p>
          </div>
          <div className="flex gap-6 text-xs text-blue-700 flex-wrap">
            {[['💳', tr.step_pays], ['🔒', tr.step_hold], ['📦', tr.step_ships], ['✅', tr.step_confirm], ['💸', tr.step_release]].map(([icono, label]) => (
              <div key={label as string} className="flex flex-col items-center gap-1">
                <span className="text-xl">{icono}</span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Grid de productos */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 flex-wrap">
                {categoriaFiltro === 0 ? tr.all_products : `${CATEGORIAS.find(c => c.id === categoriaFiltro)?.icono} ${catNames[categoriaFiltro]}`}
                {ciudadFiltro && <span className="text-sm font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">📍 {ciudadFiltro}</span>}
              </h2>
              {busqueda && <p className="text-sm text-gray-500 mt-0.5">{productosFiltrados.length} {tr.results_for} "<strong>{busqueda}</strong>"</p>}
            </div>
            {(categoriaFiltro !== 0 || ciudadFiltro) && (
              <button onClick={() => { setCategoriaFiltro(0); setCiudadFiltro('') }} className="text-sm font-medium hover:underline" style={{ color: '#007185' }}>
                {tr.see_all}
              </button>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 text-center mb-4">⚠️ {error}</div>}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">

            {loading && Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}

            {!loading && productosFiltrados.map((prod) => {
              const rating    = getRating(prod.id)
              const reviews   = getReviews(prod.id)
              const imagen    = prod.imagenes?.[0] ?? `https://picsum.photos/seed/${prod.id}/400/400`
              const enCarrito = agregarAnim === prod.id
              const p         = calcularPrecios(prod.precio, pais)
              const tieneMayoreo = prod.precio_mayoreo && prod.cantidad_minima_mayoreo

              return (
                <div key={prod.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 overflow-hidden group flex flex-col">

                  {/* Imagen */}
                  <a href={`/productos/${prod.id}`} className="relative overflow-hidden bg-gray-50 h-40 block">
                    <img src={imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    {prod.stock <= 5 && prod.stock > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">¡Últimas {prod.stock}!</span>
                    )}
                    {prod.ciudad && (
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-white bg-black/40 py-0.5">📍 {prod.ciudad}</span>
                    )}
                  </a>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">{catNames[prod.categoria_id] ?? ''}</p>
                    <a href={`/productos/${prod.id}`} className="text-xs text-gray-700 line-clamp-2 leading-snug mb-2 flex-1 hover:text-orange-600 transition">{prod.nombre}</a>

                    {/* Estrellas */}
                    <div className="flex items-center gap-1 mb-2">
                      <Estrellas rating={rating} />
                      <span className="text-[11px] text-[#007185]">({reviews})</span>
                    </div>

                    {/* Precio con IGV + arancel */}
                    <div className="mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-lg font-black" style={{ color: '#B12704' }}>{fmt(p.total)}</span>
                        {p.paisInfo && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            {p.paisInfo.bandera} +{Math.round(p.tasaArancel * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[10px] text-gray-400 leading-relaxed">
                        <div className="flex justify-between">
                          <span>Base</span><span>{fmt(p.base)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>+ IGV 18%</span><span>{fmt(p.igv)}</span>
                        </div>
                        {p.arancel > 0 && (
                          <div className="flex justify-between font-medium text-amber-600">
                            <span>+ Arancel {Math.round(p.tasaArancel * 100)}%</span>
                            <span>{fmt(p.arancel)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mayoreo */}
                    {tieneMayoreo && (
                      <div className="text-[10px] bg-green-50 text-green-700 border border-green-100 rounded px-2 py-1 mb-1.5">
                        📦 {tr.wholesale_from} {prod.cantidad_minima_mayoreo} {tr.units}: <strong>{fmt(prod.precio_mayoreo!)}</strong>
                      </div>
                    )}

                    {/* Flete */}
                    <div className="text-[10px] mb-2">
                      {prod.costo_envio === 0 || prod.costo_envio === null || prod.costo_envio === undefined
                        ? <span className="text-blue-500">🚚 {tr.agree_shipping}</span>
                        : <span className="text-gray-500">🚚 {tr.shipping_prefix}{fmt(prod.costo_envio)}</span>
                      }
                    </div>

                    {/* Botones */}
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={`/checkout?id=${prod.id}`}
                        className="w-full text-xs font-bold py-2 rounded-lg text-center transition hover:brightness-95 text-gray-900"
                        style={{ backgroundColor: '#FF9900' }}
                      >
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

            {!loading && !error && productosFiltrados.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-600 font-bold">{tr.no_products}</p>
                <button onClick={() => { setBusqueda(''); setCategoriaFiltro(0); setCiudadFiltro('') }} className="mt-3 text-sm underline" style={{ color: '#007185' }}>
                  {tr.see_all}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Banner vendedor */}
        <section className="rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: 'linear-gradient(135deg, #131921 0%, #1a2a3a 100%)' }}>
          <div>
            <p className="text-xs font-black tracking-widest mb-2" style={{ color: '#FF9900' }}>{tr.want_to_sell}</p>
            <h3 className="text-2xl font-black text-white mb-2">{tr.start_store}</h3>
            <p className="text-gray-400 text-sm">{tr.zero_commission}</p>
          </div>
          <a href="/vendedor" className="shrink-0 font-bold px-8 py-3 rounded-xl text-sm transition hover:brightness-110 whitespace-nowrap" style={{ backgroundColor: '#FF9900', color: '#131921' }}>
            {tr.create_store}
          </a>
        </section>
      </div>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-full py-3 text-sm font-medium text-white hover:brightness-110 transition" style={{ backgroundColor: '#37475A' }}>
          {tr.back_to_top}
        </button>
        <div style={{ backgroundColor: '#232f3e' }} className="py-10 px-4">
          <div className="max-w-screen-xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { titulo: 'Conócenos',    links: ['Sobre Merkao', 'Trabaja con nosotros', 'Prensa', 'Responsabilidad social'] },
              { titulo: 'Monetiza',     links: ['Vende en Merkao', 'Programa de afiliados', 'Publica con nosotros', 'Anúnciate'] },
              { titulo: 'Pago y envío', links: ['Yape y Plin', 'Tarjetas de crédito', 'Contra entrega', 'Envíos a provincias', 'Devoluciones'] },
              { titulo: 'Ayuda',        links: ['Centro de ayuda', 'Mis pedidos', 'Reportar un problema', 'Términos y condiciones', 'Privacidad'] },
            ].map((col) => (
              <div key={col.titulo}>
                <h4 className="text-white font-bold mb-4 text-sm">{col.titulo}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => <li key={l}><a href="#" className="text-gray-400 text-xs hover:text-white transition">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: '#37475A' }} className="h-px" />
        <div style={{ backgroundColor: '#232f3e' }} className="py-6 px-4">
          <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-0.5">
              <span className="text-white text-xl font-black">merkao</span>
              <span className="text-xl font-black" style={{ color: '#FF9900' }}>.pe</span>
            </a>
            <div className="flex gap-4 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition">Condiciones de uso</a>
              <a href="#" className="hover:text-white transition">Aviso de privacidad</a>
              <a href="#" className="hover:text-white transition">Cookies</a>
            </div>
            <p className="text-gray-500 text-xs">© 2026 Merkao.pe — Hecho en Perú 🇵🇪</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
