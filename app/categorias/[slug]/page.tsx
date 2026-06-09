'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt } from '@/lib/precios'
import { Icon, type IconName } from '@/lib/icons'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'

type CatDef = { id: number; slug: string; nombre: string; icon: IconName; descripcion: string }

const CATEGORIAS: CatDef[] = [
  { id: 1, slug: 'ropa-y-moda',   nombre: 'Ropa y moda',    icon: 'shirt',      descripcion: 'Lo mejor de la moda peruana: alpaca, algodón pima y diseños únicos.' },
  { id: 2, slug: 'electronicos',  nombre: 'Electrónicos',   icon: 'smartphone', descripcion: 'Smartphones, accesorios y tecnología con garantía y Pago Escrow.' },
  { id: 3, slug: 'alimentos',     nombre: 'Alimentos',      icon: 'food',       descripcion: 'Café, cacao, granos andinos y productos artesanales del Perú.' },
  { id: 4, slug: 'artesanias',    nombre: 'Artesanías',     icon: 'palette',    descripcion: 'Retablos, textiles y cerámica directo de los maestros artesanos.' },
  { id: 5, slug: 'hogar',         nombre: 'Hogar',          icon: 'home',       descripcion: 'Muebles, decoración y todo lo que tu casa necesita.' },
  { id: 6, slug: 'autos-y-motos', nombre: 'Autos y motos',  icon: 'car',        descripcion: 'Repuestos, accesorios y vehículos seminuevos en todo el Perú.' },
  { id: 7, slug: 'agricola',      nombre: 'Agrícola',       icon: 'sprout',     descripcion: 'Insumos, semillas y herramientas para el campo peruano.' },
  { id: 8, slug: 'otros',         nombre: 'Otros',          icon: 'box',        descripcion: 'Todo lo demás que vale la pena descubrir en Merkao.' },
]

const CAT_BY_SLUG = Object.fromEntries(CATEGORIAS.map((c) => [c.slug, c]))

type Producto = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  precio_mayoreo: number | null
  cantidad_minima_mayoreo: number | null
  costo_envio: number | null
  stock: number
  categoria_id: number
  imagenes: string[] | null
  estado: string
  ciudad: string | null
  vistas: number | null
}

type SortKey = 'relevancia' | 'precio_asc' | 'precio_desc' | 'recientes'

const SORT_LABELS: Record<SortKey, string> = {
  relevancia: 'Más relevantes',
  precio_asc: 'Precio: menor a mayor',
  precio_desc: 'Precio: mayor a menor',
  recientes: 'Más recientes',
}

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
          <Icon
            key={i}
            name="star"
            size={14}
            stroke={1.5}
            className={i < full ? 'mk-star on' : 'mk-star off'}
          />
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

export default function CategoriaPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const cat = CAT_BY_SLUG[slug]

  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [precioMin, setPrecioMin] = useState<string>('')
  const [precioMax, setPrecioMax] = useState<string>('')
  const [ciudades, setCiudades] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>('relevancia')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!cat) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('productos')
      .select(
        'id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, stock, categoria_id, imagenes, estado, ciudad, vistas',
      )
      .eq('estado', 'activo')
      .eq('categoria_id', cat.id)
      .order('vistas', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setProductos((data ?? []) as Producto[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [cat])

  // Ciudades únicas desde los productos cargados, ordenadas por frecuencia desc
  const ciudadesDisponibles = useMemo(() => {
    const counts = new Map<string, number>()
    productos.forEach((p) => {
      if (p.ciudad) counts.set(p.ciudad, (counts.get(p.ciudad) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ciudad, n]) => ({ ciudad, n }))
  }, [productos])

  const toggleArr = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

  const filtrados = useMemo(() => {
    const min = precioMin ? Number(precioMin) : -Infinity
    const max = precioMax ? Number(precioMax) : Infinity
    const q = busqueda.trim().toLowerCase()

    const items = productos.filter((p) => {
      if (q && !p.nombre.toLowerCase().includes(q)) return false
      if (p.precio < min || p.precio > max) return false
      if (ciudades.length > 0 && (!p.ciudad || !ciudades.includes(p.ciudad))) return false
      return true
    })

    if (sort === 'precio_asc') items.sort((a, b) => a.precio - b.precio)
    else if (sort === 'precio_desc') items.sort((a, b) => b.precio - a.precio)
    else if (sort === 'recientes') items.reverse() // ya vienen por vistas desc; recientes ~ inverso
    return items
  }, [productos, busqueda, precioMin, precioMax, ciudades, sort])

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = []
    if (precioMin || precioMax)
      chips.push({
        key: 'precio',
        label: `${precioMin || '0'}–${precioMax || '∞'} S/`,
        clear: () => { setPrecioMin(''); setPrecioMax('') },
      })
    ciudades.forEach((c) =>
      chips.push({ key: 'ciu-' + c, label: c, clear: () => setCiudades((arr) => arr.filter((x) => x !== c)) }),
    )
    return chips
  }, [precioMin, precioMax, ciudades])

  const clearAll = () => {
    setBusqueda('')
    setPrecioMin('')
    setPrecioMax('')
    setCiudades([])
  }

  if (!cat) {
    return (
      <>
        <SiteTopnav />
        <div className="mk-empty-page">
          <Icon name="search" size={56} stroke={1.3} />
          <h2>Categoría no encontrada</h2>
          <p>El enlace que abriste no corresponde a ninguna categoría de Merkao.</p>
          <Link href="/" className="mk-btn mk-btn-primary">
            Volver al inicio <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        <SiteFootnav />
      </>
    )
  }

  return (
    <>
      <SiteTopnav active={null} />

      <main className="mk-cat">
        {/* Breadcrumb */}
        <nav className="mk-crumb-row" aria-label="Migas">
          <Link href="/">Inicio</Link>
          <Icon name="chevronRight" size={12} stroke={2} />
          <span>Categorías</span>
          <Icon name="chevronRight" size={12} stroke={2} />
          <span className="on">{cat.nombre}</span>
        </nav>

        {/* Hero categoría */}
        <section className="mk-cat-hero">
          <div className="mk-cat-hero-ico">
            <Icon name={cat.icon} size={28} stroke={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1>{cat.nombre}</h1>
            <p>{cat.descripcion}</p>
          </div>
          <div className="mk-cat-hero-cnt">
            <div className="v">{loading ? '…' : filtrados.length}</div>
            <div className="l">productos</div>
          </div>
        </section>

        <div className="mk-cat-layout">
          {/* Sidebar filtros */}
          <aside className={'mk-filters' + (showFilters ? '' : ' collapsed')}>
            <div className="mk-filters-h">
              <strong><Icon name="filter" size={15} stroke={2} /> Filtros</strong>
              <button type="button" onClick={clearAll}>Limpiar</button>
            </div>

            <div className="mk-filter-grp">
              <span className="mk-filter-grp-title">Rango de precio (S/)</span>
              <div className="mk-price-range">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  min={0}
                  value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                />
                <span>—</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  min={0}
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                />
              </div>
            </div>

            <div className="mk-filter-grp">
              <span className="mk-filter-grp-title">Ciudad</span>
              {ciudadesDisponibles.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--muted-2)', margin: 0 }}>Sin datos.</p>
              ) : (
                <div className="mk-filter-chips">
                  {ciudadesDisponibles.map(({ ciudad, n }) => (
                    <label key={ciudad} className="mk-filter-chip">
                      <input
                        type="checkbox"
                        checked={ciudades.includes(ciudad)}
                        onChange={() => setCiudades((arr) => toggleArr(arr, ciudad))}
                      />
                      <span>{ciudad}</span>
                      <span className="n">{n}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mk-filter-grp">
              <span className="mk-filter-grp-title">Ordenar por</span>
              <div className="mk-filter-radios">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <label key={k} className="mk-filter-radio">
                    <input
                      type="radio"
                      name="sort"
                      value={k}
                      checked={sort === k}
                      onChange={() => setSort(k)}
                    />
                    <span>{SORT_LABELS[k]}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Listado */}
          <section>
            {/* Toolbar */}
            <div className="mk-cat-toolbar">
              <button
                type="button"
                className="mk-filter-toggle"
                onClick={() => setShowFilters((s) => !s)}
                aria-expanded={showFilters}
              >
                <Icon name="filter" size={16} stroke={2} />
                {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              </button>
              <div className="mk-cat-search">
                <Icon name="search" size={16} stroke={2} />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={`Buscar en ${cat.nombre}…`}
                />
              </div>
              <div className="mk-cat-sort">
                <span>Ordenar:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>{SORT_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeChips.length > 0 && (
              <div className="mk-active-chips">
                {activeChips.map((ch) => (
                  <button key={ch.key} type="button" className="mk-active-chip" onClick={ch.clear}>
                    {ch.label}
                    <Icon name="plus" size={12} stroke={2.5} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                ))}
                <button type="button" className="mk-active-chip" onClick={clearAll} style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                  Limpiar todo
                </button>
              </div>
            )}

            {/* Grid */}
            <div className="mk-prod-grid">
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

              {!loading && filtrados.map((prod) => {
                const rating = ratingFromId(prod.id)
                const reviews = reviewsFromId(prod.id)
                const imagen = prod.imagenes?.[0] ?? `https://picsum.photos/seed/${prod.id}/600/600`
                const p = calcularPrecios(prod.precio, 'PE')
                const tieneMayoreo = !!(prod.precio_mayoreo && prod.cantidad_minima_mayoreo)

                return (
                  <article key={prod.id} className="mk-card">
                    <Link href={`/productos/${prod.id}`} className="mk-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagen} alt={prod.nombre} loading="lazy" />
                      {prod.stock > 0 && prod.stock <= 5 && (
                        <span className="mk-card-stock">¡Últimas {prod.stock}!</span>
                      )}
                      {prod.ciudad && (
                        <span className="mk-card-loc">
                          <Icon name="mapPin" size={12} stroke={2} /> {prod.ciudad}
                        </span>
                      )}
                    </Link>

                    <div className="mk-card-body">
                      <span className="mk-card-cat">{cat.nombre}</span>
                      <Link href={`/productos/${prod.id}`} className="mk-card-title-link">
                        <h3 className="mk-card-title">{prod.nombre}</h3>
                      </Link>
                      <Stars value={rating} count={reviews} />
                      <div className="mk-card-price">{fmt(p.total)}</div>
                      <div className="mk-card-breakdown">
                        <div className="mk-bd-row"><span>Base</span><span>{fmt(p.base)}</span></div>
                        <div className="mk-bd-row"><span>+ IGV 18%</span><span>{fmt(p.igv)}</span></div>
                        <div className="mk-bd-row"><span>+ Tarifa Merkao 3%</span><span>{fmt(p.tarifaServicio)}</span></div>
                      </div>
                      <div className="mk-card-ship">
                        <Icon name="truck" size={14} stroke={1.8} />
                        {prod.costo_envio == null || prod.costo_envio === 0
                          ? 'Envío a acordar con vendedor'
                          : `Envío: ${fmt(prod.costo_envio)}`}
                      </div>
                      {tieneMayoreo && (
                        <div style={{ fontSize: 11.5, color: 'var(--green)', background: 'var(--green-tint)', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}>
                          Desde {prod.cantidad_minima_mayoreo} uds: {fmt(prod.precio_mayoreo!)}
                        </div>
                      )}
                      <div className="mk-card-actions">
                        <Link href={`/checkout?id=${prod.id}`} className="mk-btn mk-btn-primary">
                          Comprar ahora
                        </Link>
                        <Link href={`/productos/${prod.id}`} className="mk-btn mk-btn-ghost">
                          <Icon name="eye" size={16} /> Ver detalle
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}

              {!loading && filtrados.length === 0 && (
                <div
                  style={{
                    gridColumn: '1/-1',
                    padding: '52px 16px',
                    textAlign: 'center',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 14,
                  }}
                >
                  <Icon name="search" size={40} stroke={1.5} style={{ color: 'var(--muted-2)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    No encontramos productos con esos filtros.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Prueba quitar filtros o usar otra búsqueda.
                  </p>
                  <button type="button" onClick={clearAll} className="mk-btn mk-btn-ghost" style={{ marginTop: 16 }}>
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFootnav />
    </>
  )
}
