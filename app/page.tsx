'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt, ARANCELES } from '@/lib/precios'
import { useAuth } from '@/lib/useAuth'
import { T, CAT_NAMES, type Lang } from '@/lib/translations'
import { useCarritoStore } from '@/src/store/carritoStore'
import { Icon, type IconName } from '@/lib/icons'
import { DEPARTAMENTOS_PERU } from '@/lib/peru-geo'

/* ─────────────────────────── CONSTANTES ─────────────────────────── */

type CatDef = { id: number; icon: IconName; accent?: boolean }

const CATEGORIAS: CatDef[] = [
  { id: 1, icon: 'shirt' },
  { id: 2, icon: 'smartphone' },
  { id: 3, icon: 'food' },
  { id: 4, icon: 'palette' },
  { id: 5, icon: 'home' },
  { id: 6, icon: 'car' },
  { id: 7, icon: 'sprout' },
  { id: 8, icon: 'box' },
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

type HeroTheme = 'terra' | 'stone' | 'jungle' | 'gold' | 'desert'
type Slide = {
  id: string
  theme: HeroTheme
  tag: Record<Lang, string>
  region: string
  title: Record<Lang, string[]> // líneas
  sub: Record<Lang, string>
  body: Record<Lang, string>
  cta: Record<Lang, string>
  img: string
  categoriaId: number // para filtrar productos cuando el usuario hace click en el CTA
}

const SLIDES: Slide[] = [
  {
    id: 'moda',
    theme: 'terra',
    tag: { es: 'MODA & TURISMO', en: 'FASHION & TRAVEL', pt: 'MODA E TURISMO' },
    region: 'Barranco, Lima',
    title: {
      es: ['Viste el Perú,', 'descubre el Perú'],
      en: ['Wear Peru,', 'discover Peru'],
      pt: ['Vista o Peru,', 'descubra o Peru'],
    },
    sub: {
      es: 'De los murales de Barranco al mundo',
      en: "From Barranco's murals to the world",
      pt: 'Dos murais de Barranco para o mundo',
    },
    body: {
      es: 'Moda peruana que te invita a viajar por cada rincón del país.',
      en: 'Peruvian fashion that invites you to travel every corner of the country.',
      pt: 'Moda peruana que te convida a viajar por todos os cantos do país.',
    },
    cta: { es: 'Explorar moda', en: 'Explore fashion', pt: 'Explorar moda' },
    img: 'https://images.unsplash.com/photo-1660521844005-015733ce411e?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 1,
  },
  {
    id: 'andes',
    theme: 'stone',
    tag: { es: 'HECHO A MANO', en: 'HANDMADE', pt: 'FEITO À MÃO' },
    region: 'Cusco · Andes',
    title: {
      es: ['Artesanía que', 'cuenta historias'],
      en: ['Crafts that', 'tell stories'],
      pt: ['Artesanato que', 'conta histórias'],
    },
    sub: {
      es: 'Directo de los Andes a tu casa',
      en: 'Straight from the Andes to your home',
      pt: 'Direto dos Andes para a sua casa',
    },
    body: {
      es: 'Cada pieza guarda el trabajo de manos peruanas.',
      en: 'Each piece holds the work of Peruvian hands.',
      pt: 'Cada peça guarda o trabalho de mãos peruanas.',
    },
    cta: { es: 'Ver artesanías', en: 'See crafts', pt: 'Ver artesanato' },
    img: 'https://images.unsplash.com/photo-1574333360968-50e1fc6035b8?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 4,
  },
  {
    id: 'selva',
    theme: 'jungle',
    tag: { es: 'HECHO EN LA SELVA', en: 'MADE IN THE RAINFOREST', pt: 'FEITO NA FLORESTA' },
    region: 'Amazonía peruana',
    title: {
      es: ['Detrás de cada', 'producto, una familia'],
      en: ['Behind every', 'product, a family'],
      pt: ['Por trás de cada', 'produto, uma família'],
    },
    sub: {
      es: 'Comunidades de la Amazonía',
      en: 'Amazon rainforest communities',
      pt: 'Comunidades da Amazônia',
    },
    body: {
      es: 'Compra directo a las familias que cultivan y crean con orgullo.',
      en: 'Buy directly from the families who farm and craft with pride.',
      pt: 'Compre diretamente das famílias que cultivam e criam com orgulho.',
    },
    cta: { es: 'Productos de la selva', en: 'Rainforest products', pt: 'Produtos da floresta' },
    img: 'https://images.unsplash.com/photo-1701091490268-2ae3de5f5f2f?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 3,
  },
  {
    id: 'campo',
    theme: 'gold',
    tag: { es: 'DEL CAMPO', en: 'FROM THE FARM', pt: 'DO CAMPO' },
    region: 'Sierra y valles',
    title: {
      es: ['Del campo peruano', 'a tu mesa'],
      en: ['From the Peruvian', 'farm to your table'],
      pt: ['Do campo peruano', 'à sua mesa'],
    },
    sub: {
      es: 'Frescura de cada región',
      en: 'Freshness from every region',
      pt: 'Frescor de cada região',
    },
    body: {
      es: 'Café, miel, cacao y granos andinos, directo del productor.',
      en: 'Coffee, honey, cocoa and Andean grains, straight from the producer.',
      pt: 'Café, mel, cacau e grãos andinos, direto do produtor.',
    },
    cta: { es: 'Ver alimentos', en: 'See food', pt: 'Ver alimentos' },
    img: 'https://images.unsplash.com/photo-1586095516671-d085ff58cdd4?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 7,
  },
  {
    id: 'maravillas',
    theme: 'desert',
    tag: { es: 'DESCUBRE EL PERÚ', en: 'DISCOVER PERU', pt: 'DESCUBRA O PERU' },
    region: 'Líneas de Nazca',
    title: {
      es: ['Un país lleno de', 'maravillas'],
      en: ['A country full of', 'wonders'],
      pt: ['Um país cheio de', 'maravilhas'],
    },
    sub: {
      es: 'De las Líneas de Nazca a Machu Picchu',
      en: 'From the Nazca Lines to Machu Picchu',
      pt: 'Das Linhas de Nazca a Machu Picchu',
    },
    body: {
      es: 'Vende y compra en el país de los mil destinos.',
      en: 'Sell and buy in the country of a thousand destinations.',
      pt: 'Venda e compre no país dos mil destinos.',
    },
    cta: { es: 'Conoce el Perú', en: 'Discover Peru', pt: 'Conheça o Peru' },
    img: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

type EscrowStep = { icon: IconName; labelKey: 'step_pays' | 'step_hold' | 'step_ships' | 'step_confirm' | 'step_release' }
const ESCROW_STEPS: EscrowStep[] = [
  { icon: 'card',        labelKey: 'step_pays' },
  { icon: 'lock',        labelKey: 'step_hold' },
  { icon: 'truck',       labelKey: 'step_ships' },
  { icon: 'checkCircle', labelKey: 'step_confirm' },
  { icon: 'wallet',      labelKey: 'step_release' },
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

function ratingFromId(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Math.round((4.0 + (n % 11) / 10) * 10) / 10
}
function reviewsFromId(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 50 + (n % 950)
}

function Stars({ value, count }: { value: number; count?: number }) {
  const full = Math.round(value)
  return (
    <div className="mk-stars" aria-label={`${value} de 5`}>
      <div className="mk-stars-track">
        {[0, 1, 2, 3, 4].map((i) => (
          <Icon key={i} name="star" size={14} stroke={1.5} className={i < full ? 'mk-star on' : 'mk-star off'} />
        ))}
      </div>
      {count != null && <span className="mk-stars-count">({count})</span>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="mk-skel">
      <div className="mk-skel-img" />
      <div className="mk-skel-body">
        <div className="mk-skel-line w50" />
        <div className="mk-skel-line w90" />
        <div className="mk-skel-line w70" />
      </div>
    </div>
  )
}

/* ─────────────────────────── PÁGINA ─────────────────────────── */

export default function Home() {
  const [slideIdx, setSlideIdx]               = useState(0)
  const [slideLocked, setSlideLocked]         = useState(false)
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
  const [favoritos, setFavoritos]             = useState<Set<string>>(new Set())
  const [toast, setToast]                     = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { user }  = useAuth()
  const tr        = T[lang]
  const catNames  = CAT_NAMES[lang]

  // ── Idioma persistido ──
  useEffect(() => {
    const saved = localStorage.getItem('merkao_lang') as Lang | null
    if (saved && ['es', 'en', 'pt'].includes(saved)) setLang(saved)
  }, [])

  const cambiarIdioma = (l: Lang) => {
    setLang(l)
    localStorage.setItem('merkao_lang', l)
  }

  // ── País por IP ──
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((d) => { if (d?.country_code) setPais(d.country_code) })
      .catch(() => {})
  }, [])

  // ── Carousel ──
  const siguiente = useCallback(() => setSlideIdx((p) => (p + 1) % SLIDES.length), [])
  const anterior  = useCallback(() => setSlideIdx((p) => (p - 1 + SLIDES.length) % SLIDES.length), [])
  useEffect(() => {
    if (slideLocked) return
    const t = setInterval(siguiente, 6500)
    return () => clearInterval(t)
  }, [siguiente, slideLocked])

  // ── Auto-lock hero en slide cuya categoría sea la dominante ──
  useEffect(() => {
    let cancel = false
    async function detectar() {
      const { data, error } = await supabase
        .from('productos')
        .select('categoria_id')
        .eq('estado', 'activo')
        .gt('stock', 0)
      if (cancel || error || !data || data.length === 0) return
      const counts = new Map<number, number>()
      for (const row of data) counts.set(row.categoria_id, (counts.get(row.categoria_id) || 0) + 1)
      let topCat = 0, topCount = 0
      for (const [cat, n] of counts) if (n > topCount) { topCount = n; topCat = cat }
      const idx = SLIDES.findIndex((s) => s.categoriaId === topCat)
      if (idx >= 0) {
        setSlideIdx(idx)
        setSlideLocked(true)
      }
    }
    detectar()
    return () => { cancel = true }
  }, [])

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
      if (e) setError(lang === 'en' ? 'Could not load products.' : lang === 'pt' ? 'Não foi possível carregar os produtos.' : 'No se pudieron cargar los productos.')
      else setProductos(data || [])
      setLoading(false)
    }
    cargar()
  }, [categoriaFiltro, ciudadFiltro, lang])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1900)
  }

  const agregarAlCarrito = (id: string) => {
    setAgregarAnim(id)
    setTimeout(() => setAgregarAnim(null), 700)
    showToast(lang === 'en' ? 'Added to cart' : lang === 'pt' ? 'Adicionado ao carrinho' : 'Producto agregado al carrito')
  }

  const toggleFav = (id: string) => {
    setFavoritos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const goToShop = (catId: number) => {
    setCategoriaFiltro(catId)
    setSlideLocked(true)
    setTimeout(() => {
      const el = document.getElementById('mk-shop')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const productosFiltrados = busqueda.trim()
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos

  const arancelInfo = ARANCELES[pais]
  const userLabel   = user?.email ? user.email.split('@')[0] : null
  const cartCount   = totalItems()

  return (
    <>
      {/* ══════════════════ HEADER ══════════════════ */}
      <header className="mk-hdr">
        <div className="mk-hdr-top">
          <div className="mk-hdr-inner">
            <a className="mk-logo" href="/">merkao<span className="mk-logo-dot">.pe</span></a>

            <div className="mk-ship-from">
              <span className="mk-ship-label">{tr.delivering_from}</span>
              <span className="mk-ship-where">
                {arancelInfo ? `${arancelInfo.bandera} ${arancelInfo.pais}` : '🇵🇪 Perú'}
              </span>
            </div>

            <div className="mk-searchbar">
              <select
                className="mk-search-cat"
                value={categoriaSearch}
                onChange={(e) => setCategoriaSearch(Number(e.target.value))}
                aria-label="Categoría"
              >
                <option value={0}>{catNames[0]}</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>{catNames[c.id]}</option>
                ))}
              </select>
              <input
                className="mk-search-input"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={tr.search_placeholder}
              />
              <button className="mk-search-btn" aria-label="Buscar">
                <Icon name="search" size={20} />
              </button>
            </div>

            <div className="mk-lang">
              {(['es', 'en', 'pt'] as Lang[]).map((l) => (
                <button
                  key={l}
                  className={'mk-lang-btn' + (lang === l ? ' on' : '')}
                  onClick={() => cambiarIdioma(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {userLabel ? (
              <a className="mk-hdr-link mk-account" href="/perfil">
                <Icon name="user" size={22} stroke={1.8} />
                <span className="mk-hdr-link-txt">
                  <small>{tr.hello_user} {userLabel}</small>
                  <strong>{tr.account.replace('▾', '').trim()} <Icon name="chevronDown" size={12} /></strong>
                </span>
              </a>
            ) : (
              <a className="mk-hdr-link mk-account" href="/login">
                <Icon name="user" size={22} stroke={1.8} />
                <span className="mk-hdr-link-txt">
                  <small>{tr.hello_sign_in}</small>
                  <strong>{tr.account.replace('▾', '').trim()} <Icon name="chevronDown" size={12} /></strong>
                </span>
              </a>
            )}

            <a className="mk-hdr-link" href="/pedidos">
              <span className="mk-hdr-link-txt right">
                <small>{tr.my_orders_label}</small>
                <strong>{tr.my_orders}</strong>
              </span>
            </a>

            <a className="mk-cart-btn" href="/carrito">
              <span className="mk-cart-ico">
                <Icon name="cart" size={24} stroke={1.8} />
                {cartCount > 0 && <span className="mk-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
              </span>
              <strong>{tr.cart}</strong>
            </a>
          </div>
        </div>

        {arancelInfo && (
          <div className="mk-arancel">
            {arancelInfo.bandera} {tr.delivering_from} <strong>{arancelInfo.pais}</strong> —{' '}
            {lang === 'en' ? 'import duty' : lang === 'pt' ? 'tarifa de importação' : 'arancel de importación'}: <strong>{Math.round(arancelInfo.tasa * 100)}%</strong>
            <button onClick={() => setPais('PE')}>{tr.change_to_peru}</button>
          </div>
        )}

        <nav className="mk-hdr-nav">
          <div className="mk-hdr-inner">
            <button className="mk-nav-all">
              <Icon name="menu" size={18} />
              {lang === 'en' ? 'All categories' : lang === 'pt' ? 'Todas as categorias' : 'Todas las categorías'}
            </button>
            <div className="mk-nav-cats">
              <button onClick={() => goToShop(0)} className="mk-nav-cat accent">
                <Icon name="flame" size={16} stroke={1.8} />
                {lang === 'en' ? 'Daily deals' : lang === 'pt' ? 'Ofertas do dia' : 'Ofertas del día'}
              </button>
              {CATEGORIAS.map((c) => (
                <a key={c.id} href={`/categorias/${CAT_SLUG[c.id]}`} className="mk-nav-cat">
                  <Icon name={c.icon} size={16} stroke={1.8} /> {catNames[c.id]}
                </a>
              ))}
            </div>
            <a className="mk-nav-sell" href="/vendedor">
              <Icon name="store" size={17} stroke={1.8} />
              {lang === 'en' ? 'Sell on Merkao' : lang === 'pt' ? 'Vender no Merkao' : 'Vende en Merkao'}
            </a>
          </div>
        </nav>
      </header>

      {/* ══════════════════ MAIN ══════════════════ */}
      <main className="mk-main">

        {/* HERO carousel */}
        <section
          className="mk-hero"
          onMouseEnter={() => setSlideLocked(true)}
          onMouseLeave={() => setSlideLocked(false)}
        >
          {SLIDES.map((sl, k) => (
            <div key={sl.id} className={`mk-hslide mk-theme-${sl.theme}${k === slideIdx ? ' on' : ''}`}>
              <div className="mk-hslide-copy">
                <span className="mk-hero-tag"><Icon name="zap" size={13} /> {sl.tag[lang]}</span>
                <h1 className="mk-hero-title">
                  {sl.title[lang].map((line, j) => <span key={j}>{line}</span>)}
                </h1>
                <p className="mk-hero-sub">{sl.sub[lang]}</p>
                <p className="mk-hero-body">{sl.body[lang]}</p>
                <button className="mk-hero-cta" onClick={() => goToShop(sl.categoriaId)}>
                  {sl.cta[lang]} <Icon name="arrowRight" size={18} />
                </button>
              </div>
              <div className="mk-hslide-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sl.img} alt={sl.region} loading={k === 0 ? 'eager' : 'lazy'} />
                <span className="mk-hslide-region">
                  <Icon name="mapPin" size={13} stroke={2} /> {sl.region}
                </span>
              </div>
            </div>
          ))}
          <button className="mk-hero-arrow left" onClick={anterior} aria-label="Anterior"><Icon name="chevronLeft" size={26} /></button>
          <button className="mk-hero-arrow right" onClick={siguiente} aria-label="Siguiente"><Icon name="chevronRight" size={26} /></button>
          <div className="mk-hero-dots">
            {SLIDES.map((s, k) => (
              <button
                key={s.id}
                className={'mk-dot' + (k === slideIdx ? ' on' : '')}
                onClick={() => setSlideIdx(k)}
                aria-label={`Slide ${k + 1}`}
              />
            ))}
          </div>
        </section>

        {/* ESCROW strip */}
        <a className="mk-escrow" href="#escrow-info">
          <div className="mk-escrow-lead">
            <span className="mk-escrow-ico"><Icon name="shield" size={26} stroke={1.7} /></span>
            <div>
              <h3>{tr.escrow_title}</h3>
              <p>{tr.escrow_desc}</p>
            </div>
          </div>
          <div className="mk-escrow-steps">
            {ESCROW_STEPS.map((s, k) => (
              <span key={s.labelKey} style={{ display: 'contents' }}>
                <div className="mk-escrow-step">
                  <span className="mk-escrow-step-ico"><Icon name={s.icon} size={20} stroke={1.8} /></span>
                  <span className="mk-escrow-step-label">{tr[s.labelKey]}</span>
                </div>
                {k < ESCROW_STEPS.length - 1 && (
                  <span className="mk-escrow-sep"><Icon name="chevronRight" size={14} /></span>
                )}
              </span>
            ))}
          </div>
        </a>

        {/* CATEGORÍAS */}
        <section className="mk-block">
          <div className="mk-block-head">
            <h2>{tr.buy_by_category}</h2>
          </div>
          <div className="mk-cat-grid">
            {CATEGORIAS.map((c) => (
              <a key={c.id} href={`/categorias/${CAT_SLUG[c.id]}`} className="mk-cat-tile">
                <span className="mk-cat-tile-ico"><Icon name={c.icon} size={26} stroke={1.6} /></span>
                <span className="mk-cat-tile-label">{catNames[c.id]}</span>
              </a>
            ))}
          </div>
        </section>

        {/* FILTROS DE CIUDAD */}
        <div className="mk-city-row" role="tablist" aria-label={tr.filter_by_city}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
            <Icon name="mapPin" size={14} stroke={2} /> {tr.filter_by_city}:
          </span>
          <button
            onClick={() => setCiudadFiltro('')}
            className={'mk-city-chip' + (!ciudadFiltro ? ' on' : '')}
          >
            {tr.all_cities}
          </button>
          {DEPARTAMENTOS_PERU.map((dep) => (
            <button
              key={dep}
              onClick={() => setCiudadFiltro(dep === ciudadFiltro ? '' : dep)}
              className={'mk-city-chip' + (ciudadFiltro === dep ? ' on' : '')}
            >
              {dep}
            </button>
          ))}
        </div>

        {/* SHOP: products grid + AdRail */}
        <section id="mk-shop" className="mk-shop">
          <div className="mk-shop-main">
            <div className="mk-block-head">
              <h2>
                {categoriaFiltro === 0
                  ? tr.all_products
                  : catNames[categoriaFiltro]}
                {ciudadFiltro && (
                  <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 600, color: 'var(--brand-700)' }}>
                    · {ciudadFiltro}
                  </span>
                )}
              </h2>
              {(categoriaFiltro !== 0 || ciudadFiltro || busqueda) && (
                <button
                  className="mk-block-link"
                  onClick={() => { setCategoriaFiltro(0); setCiudadFiltro(''); setBusqueda('') }}
                >
                  {tr.see_all}
                </button>
              )}
            </div>

            {busqueda && (
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {productosFiltrados.length} {tr.results_for} &ldquo;<strong>{busqueda}</strong>&rdquo;
              </p>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 14, color: '#B91C1C', fontSize: 14 }}>
                ⚠️ {error}
              </div>
            )}

            <div className="mk-prod-grid">
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

              {!loading && productosFiltrados.map((prod) => {
                const rating  = ratingFromId(prod.id)
                const reviews = reviewsFromId(prod.id)
                const imagen  = prod.imagenes?.[0] ?? `https://picsum.photos/seed/${prod.id}/600/600`
                const enCarrito = agregarAnim === prod.id
                const p = calcularPrecios(prod.precio, pais)
                const tieneMayoreo = prod.precio_mayoreo && prod.cantidad_minima_mayoreo
                const fav = favoritos.has(prod.id)

                return (
                  <article key={prod.id} className="mk-card">
                    <a href={`/productos/${prod.id}`} className="mk-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagen} alt={prod.nombre} loading="lazy" />
                      {prod.stock > 0 && prod.stock <= 5 && (
                        <span className="mk-card-stock">
                          {lang === 'en' ? `Only ${prod.stock} left` : lang === 'pt' ? `Restam ${prod.stock}` : `¡Últimas ${prod.stock}!`}
                        </span>
                      )}
                      {prod.ciudad && (
                        <span className="mk-card-loc">
                          <Icon name="mapPin" size={12} stroke={2} /> {prod.ciudad}
                        </span>
                      )}
                      <button
                        className={'mk-card-fav' + (fav ? ' on' : '')}
                        onClick={(e) => { e.preventDefault(); toggleFav(prod.id) }}
                        aria-label="Guardar"
                        aria-pressed={fav}
                      >
                        <Icon name="heart" size={17} stroke={2} />
                      </button>
                    </a>

                    <div className="mk-card-body">
                      <span className="mk-card-cat">{catNames[prod.categoria_id] ?? ''}</span>
                      <a href={`/productos/${prod.id}`} className="mk-card-title-link">
                        <h3 className="mk-card-title">{prod.nombre}</h3>
                      </a>
                      <Stars value={rating} count={reviews} />
                      <div className="mk-card-price">{fmt(p.total)}</div>
                      <div className="mk-card-breakdown">
                        <div className="mk-bd-row"><span>{lang === 'en' ? 'Base price' : lang === 'pt' ? 'Preço base' : 'Base'}</span><span>{fmt(p.base)}</span></div>
                        <div className="mk-bd-row"><span>+ IGV 18%</span><span>{fmt(p.igv)}</span></div>
                        {p.arancel > 0 && p.paisInfo && (
                          <div className="mk-bd-row amber">
                            <span>+ {p.paisInfo.bandera} {Math.round(p.tasaArancel * 100)}%</span>
                            <span>{fmt(p.arancel)}</span>
                          </div>
                        )}
                        <div className="mk-bd-row">
                          <span>+ {lang === 'en' ? 'Merkao service 3%' : lang === 'pt' ? 'Taxa Merkao 3%' : 'Tarifa Merkao 3%'}</span>
                          <span>{fmt(p.tarifaServicio)}</span>
                        </div>
                      </div>
                      <div className="mk-card-ship">
                        <Icon name="truck" size={14} stroke={1.8} />
                        {prod.costo_envio === 0 || prod.costo_envio == null
                          ? tr.agree_shipping
                          : `${tr.shipping_prefix}${fmt(prod.costo_envio)}`}
                      </div>
                      {tieneMayoreo && (
                        <div style={{ fontSize: 11.5, color: 'var(--green)', background: 'var(--green-tint)', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}>
                          {tr.wholesale_from} {prod.cantidad_minima_mayoreo} {tr.units}: {fmt(prod.precio_mayoreo!)}
                        </div>
                      )}
                      <div className="mk-card-actions">
                        <a href={`/checkout?id=${prod.id}`} className="mk-btn mk-btn-primary">
                          {tr.buy_now}
                        </a>
                        <button
                          onClick={() => agregarAlCarrito(prod.id)}
                          className="mk-btn mk-btn-ghost"
                          style={enCarrito ? { background: 'var(--green-tint)', borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
                        >
                          <Icon name="plus" size={16} /> {enCarrito ? tr.added : tr.add_to_cart}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}

              {!loading && !error && productosFiltrados.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: '64px 16px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
                  <Icon name="search" size={40} stroke={1.5} style={{ color: 'var(--muted-2)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{tr.no_products}</p>
                  <button
                    onClick={() => { setBusqueda(''); setCategoriaFiltro(0); setCiudadFiltro('') }}
                    className="mk-btn mk-btn-ghost"
                    style={{ marginTop: 16 }}
                  >
                    {tr.see_all}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AdRail: PresupIA Web + DevNova + Vende en Merkao */}
          <aside className="mk-ad-rail">
            <a href="https://presupia-web.vercel.app" target="_blank" rel="noopener noreferrer" className="mk-ad mk-ad-presupia">
              <span className="mk-ad-label">Ad</span>
              <span className="mk-ad-pill"><Icon name="zap" size={12} stroke={2} /> PresupIA</span>
              <h3 className="mk-ad-head">
                {lang === 'en' ? 'Build in Peru? Generate your budget with AI' : lang === 'pt' ? 'Constrói no Peru? Gere seu orçamento com IA' : '¿Construyes en Perú? Genera tu presupuesto con IA'}
              </h3>
              <p className="mk-ad-sub">
                {lang === 'en' ? 'Upload your plan and get a budget in seconds.' : lang === 'pt' ? 'Envie seu projeto e obtenha um orçamento em segundos.' : 'Sube tu plano y obtén presupuesto en segundos.'}
              </p>
              <span className="mk-ad-cta mk-ad-cta-blue">
                {lang === 'en' ? 'Try free' : lang === 'pt' ? 'Testar grátis' : 'Probar gratis'} <Icon name="arrowRight" size={14} />
              </span>
            </a>

            <a href="https://devnovaai.com" target="_blank" rel="noopener noreferrer" className="mk-ad mk-ad-devnova">
              <span className="mk-ad-label">Ad</span>
              <span className="mk-ad-pill"><Icon name="zap" size={12} stroke={2} /> DevNova AI</span>
              <h3 className="mk-ad-head">
                {lang === 'en' ? 'Got an app or web idea? We build it' : lang === 'pt' ? 'Tem uma ideia de app ou web? A gente faz' : '¿Tienes una idea de app o web? Te la construimos'}
              </h3>
              <p className="mk-ad-sub">
                {lang === 'en' ? 'Mobile apps, websites and software with AI · devnovaai.com' : lang === 'pt' ? 'Apps, sites e software com IA · devnovaai.com' : 'Apps móviles, webs y software con IA · devnovaai.com'}
              </p>
              <span className="mk-ad-cta mk-ad-cta-mint">
                {lang === 'en' ? 'Get a quote' : lang === 'pt' ? 'Solicitar orçamento' : 'Cotizar proyecto'} <Icon name="arrowRight" size={14} />
              </span>
            </a>

            <a href="/vendedor" className="mk-ad mk-ad-sell">
              <span className="mk-ad-pill"><Icon name="store" size={12} stroke={2} /> {tr.want_to_sell.replace('¿', '').replace('?', '').replace('¡', '')}</span>
              <h3 className="mk-ad-head">{tr.start_store}</h3>
              <p className="mk-ad-sub">
                {lang === 'en'
                  ? 'Seller keeps 100% of the price. Merkao charges 3% to the buyer.'
                  : lang === 'pt'
                  ? 'O vendedor recebe 100%. Merkao cobra 3% ao comprador.'
                  : 'El vendedor recibe el 100% de su precio. Merkao cobra 3% al comprador.'}
              </p>
              <span className="mk-ad-cta mk-ad-cta-orange">
                {tr.create_store} <Icon name="arrowRight" size={14} />
              </span>
            </a>
          </aside>
        </section>
      </main>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="mk-footer">
        <div className="mk-footer-inner">
          <div className="mk-footer-brand">
            <a className="mk-logo mk-logo-foot" href="/">merkao<span className="mk-logo-dot">.pe</span></a>
            <p>
              {lang === 'en'
                ? 'The Peruvian marketplace. Buy and sell across Peru with protected payment.'
                : lang === 'pt'
                ? 'O marketplace peruano. Compre e venda em todo o Peru com pagamento protegido.'
                : 'El marketplace peruano. Compra y vende en todo el Perú con pago protegido.'}
            </p>
            <span className="mk-footer-trust"><Icon name="shield" size={16} /> {tr.escrow_title}</span>
          </div>

          {([
            {
              h: lang === 'en' ? 'Buy' : lang === 'pt' ? 'Comprar' : 'Comprar',
              items: [
                { label: lang === 'en' ? 'Daily deals' : lang === 'pt' ? 'Ofertas do dia' : 'Ofertas del día', href: '#' },
                { label: tr.buy_by_category, href: '#' },
                { label: lang === 'en' ? 'How to buy' : lang === 'pt' ? 'Como comprar' : 'Cómo comprar', href: '#' },
                { label: tr.escrow_title, href: '#' },
              ],
            },
            {
              h: lang === 'en' ? 'Sell' : lang === 'pt' ? 'Vender' : 'Vender',
              items: [
                { label: lang === 'en' ? 'Sell on Merkao' : lang === 'pt' ? 'Vender no Merkao' : 'Vende en Merkao', href: '/vendedor' },
                { label: lang === 'en' ? 'Publish product' : lang === 'pt' ? 'Publicar produto' : 'Publicar producto', href: '/vendedor/publicar' },
                { label: lang === 'en' ? 'Fees & commissions' : lang === 'pt' ? 'Tarifas e comissões' : 'Tarifas y comisiones', href: '#' },
                { label: lang === 'en' ? 'Seller center' : lang === 'pt' ? 'Centro de vendedores' : 'Centro de vendedores', href: '/vendedor' },
              ],
            },
            {
              h: lang === 'en' ? 'Help' : lang === 'pt' ? 'Ajuda' : 'Ayuda',
              items: [
                { label: lang === 'en' ? 'Help center' : lang === 'pt' ? 'Central de ajuda' : 'Centro de ayuda', href: '#' },
                { label: lang === 'en' ? 'Shipping & delivery' : lang === 'pt' ? 'Envios e entregas' : 'Envíos y entregas', href: '#' },
                { label: lang === 'en' ? 'Returns' : lang === 'pt' ? 'Devoluções' : 'Devoluciones', href: '#' },
                { label: lang === 'en' ? 'Contact' : lang === 'pt' ? 'Contato' : 'Contacto', href: '/contacto' },
              ],
            },
            {
              h: 'Merkao',
              items: [
                { label: lang === 'en' ? 'About us' : lang === 'pt' ? 'Sobre nós' : 'Sobre nosotros', href: '#' },
                { label: lang === 'en' ? 'Made in Peru' : lang === 'pt' ? 'Feito no Peru' : 'Hecho en Perú', href: '#' },
                { label: lang === 'en' ? 'Careers' : lang === 'pt' ? 'Trabalhe conosco' : 'Trabaja con nosotros', href: '#' },
                { label: lang === 'en' ? 'Terms & privacy' : lang === 'pt' ? 'Termos e privacidade' : 'Términos y privacidad', href: '#' },
              ],
            },
          ] as const).map((col) => (
            <div key={col.h} className="mk-footer-col">
              <h4>{col.h}</h4>
              <ul>
                {col.items.map((it) => (
                  <li key={it.label}><a href={it.href}>{it.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mk-footer-bar">
          <span>© 2026 Merkao · {lang === 'en' ? 'Made in Peru' : lang === 'pt' ? 'Feito no Peru' : 'Hecho en Perú'}</span>
          <span>
            {lang === 'en' ? 'We accept' : lang === 'pt' ? 'Aceitamos' : 'Aceptamos'}: Yape · Plin · Visa · Mastercard · {lang === 'en' ? 'Transfer' : lang === 'pt' ? 'Transferência' : 'Transferencia'}
          </span>
        </div>
      </footer>

      {/* TOAST */}
      {toast && (
        <div className="mk-toast">
          <Icon name="checkCircle" size={18} /> {toast}
        </div>
      )}

      {/* signOut helper invisible para no romper hooks anteriores */}
      <button onClick={handleSignOut} style={{ display: 'none' }} aria-hidden tabIndex={-1} />
    </>
  )
}
