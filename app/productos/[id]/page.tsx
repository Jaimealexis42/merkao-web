'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt } from '@/lib/precios'
import { useCarritoStore } from '@/src/store/carritoStore'
import { Icon, type IconName } from '@/lib/icons'

type Producto = {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_mayoreo: number | null
  cantidad_minima_mayoreo: number | null
  costo_envio: number | null
  ciudad: string | null
  categoria_id: number
  condicion: string | null
  stock: number
  imagenes: string[] | null
  vendedor_id: string | null
  created_at: string
}

type CatDef = { id: number; slug: string; nombre: string; icon: IconName }

const CATEGORIAS: CatDef[] = [
  { id: 1, slug: 'ropa-y-moda',   nombre: 'Ropa y moda',   icon: 'shirt' },
  { id: 2, slug: 'electronicos',  nombre: 'Electrónicos',  icon: 'smartphone' },
  { id: 3, slug: 'alimentos',     nombre: 'Alimentos',     icon: 'food' },
  { id: 4, slug: 'artesanias',    nombre: 'Artesanías',    icon: 'palette' },
  { id: 5, slug: 'hogar',         nombre: 'Hogar',         icon: 'home' },
  { id: 6, slug: 'autos-y-motos', nombre: 'Autos y motos', icon: 'car' },
  { id: 7, slug: 'agricola',      nombre: 'Agrícola',      icon: 'sprout' },
  { id: 8, slug: 'otros',         nombre: 'Otros',         icon: 'box' },
]
const CAT_BY_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]))

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value)
  return (
    <div className="mk-stars-track">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={size} stroke={1.5} className={i < full ? 'mk-star on' : 'mk-star off'} />
      ))}
    </div>
  )
}

function ratingFromId(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Math.round((4.0 + (n % 11) / 10) * 10) / 10
}
function reviewsFromId(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 50 + (n % 950)
}
function soldFromId(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 80 + (n % 240)
}

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [producto, setProducto] = useState<Producto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cantidad, setCantidad] = useState(1)
  const [imagenActiva, setImagenActiva] = useState(0)
  const [added, setAdded] = useState(false)
  const [fav, setFav] = useState(false)
  const [relacionados, setRelacionados] = useState<Producto[]>([])

  const agregarItem = useCarritoStore((s) => s.agregarItem)
  const totalItems = useCarritoStore((s) => s.totalItems)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('productos')
        .select(
          'id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, ciudad, categoria_id, condicion, stock, imagenes, vendedor_id, created_at',
        )
        .eq('id', id)
        .single()

      if (cancelled) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const prod = data as Producto
      setProducto(prod)
      setImagenActiva(0)
      setLoading(false)

      // Related: same category, excluding current, max 4
      const { data: rel } = await supabase
        .from('productos')
        .select(
          'id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, ciudad, categoria_id, condicion, stock, imagenes, vendedor_id, created_at',
        )
        .eq('estado', 'activo')
        .eq('categoria_id', prod.categoria_id)
        .neq('id', prod.id)
        .order('vistas', { ascending: false })
        .limit(4)
      if (!cancelled) setRelacionados((rel ?? []) as Producto[])
    })()

    return () => { cancelled = true }
  }, [id])

  const rating = useMemo(() => (producto ? ratingFromId(producto.id) : 0), [producto])
  const numResenas = useMemo(() => (producto ? reviewsFromId(producto.id) : 0), [producto])
  const sold = useMemo(() => (producto ? soldFromId(producto.id) : 0), [producto])

  if (loading) {
    return (
      <div className="mk-empty-page">
        <p style={{ color: 'var(--muted-2)' }}>Cargando producto…</p>
      </div>
    )
  }

  if (notFound || !producto) {
    return (
      <div className="mk-empty-page">
        <Icon name="box" size={56} stroke={1.4} />
        <h2>Producto no encontrado</h2>
        <p>Este producto no existe o fue eliminado.</p>
        <Link href="/" className="mk-btn mk-btn-primary" style={{ marginTop: 8 }}>
          Volver al inicio
        </Link>
      </div>
    )
  }

  const cat = CAT_BY_ID[producto.categoria_id]
  const catNombre = cat?.nombre ?? 'Categoría'
  const catSlug = cat?.slug ?? 'otros'

  const precioActivo =
    producto.precio_mayoreo &&
    producto.cantidad_minima_mayoreo &&
    cantidad >= producto.cantidad_minima_mayoreo
      ? producto.precio_mayoreo
      : producto.precio

  const precios = calcularPrecios(precioActivo)
  const esMayoreo = !!(
    producto.precio_mayoreo &&
    producto.cantidad_minima_mayoreo &&
    cantidad >= producto.cantidad_minima_mayoreo
  )
  const precioOriginalTotal = calcularPrecios(producto.precio).total
  const descuentoPct = esMayoreo
    ? Math.round((1 - producto.precio_mayoreo! / producto.precio) * 100)
    : 0

  const imgs = (producto.imagenes ?? []).filter(Boolean)
  const galeria: (string | null)[] = imgs.length > 0
    ? (imgs.length >= 4 ? imgs.slice(0, 4) : [...imgs, ...Array(4 - imgs.length).fill(null)])
    : [null, null, null, null]
  const stockBajo = producto.stock > 0 && producto.stock <= 5
  const condicionLabel = (producto.condicion ?? 'nuevo').toLowerCase()
  const esNuevo = condicionLabel === 'nuevo'

  const handleBuyNow = () => {
    router.push(`/checkout?id=${producto.id}&cantidad=${cantidad}`)
  }

  const handleAddToCart = () => {
    agregarItem(
      {
        id: producto.id,
        nombre: producto.nombre,
        precio: precios.subtotal,
        imagen: imgs[0] ?? null,
        vendedor: producto.ciudad ?? 'Vendedor Merkao',
      },
      cantidad,
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const incrementar = () => {
    if (cantidad < producto.stock) setCantidad((q) => q + 1)
  }
  const decrementar = () => {
    if (cantidad > 1) setCantidad((q) => q - 1)
  }

  const distribucion: [string, number][] = [['5', 78], ['4', 15], ['3', 5], ['2', 1], ['1', 1]]

  return (
    <>
      {/* ── Header compacto ── */}
      <header className="mk-phdr">
        <div className="mk-phdr-inner">
          <Link href="/" className="mk-logo">
            merkao<span className="mk-logo-dot">.pe</span>
          </Link>
          <div className="mk-phdr-search">
            <input placeholder="Buscar productos, marcas y categorías…" />
            <button className="mk-phdr-search-btn" aria-label="Buscar">
              <Icon name="search" size={19} />
            </button>
          </div>
          <Link className="mk-phdr-link" href="/vende">
            <Icon name="store" size={17} stroke={1.8} /> Vende en Merkao
          </Link>
          <Link className="mk-phdr-cart" href="/carrito">
            <span className="mk-cart-ico">
              <Icon name="cart" size={22} stroke={1.8} />
              {totalItems() > 0 && (
                <span className="mk-cart-badge">{totalItems() > 99 ? '99+' : totalItems()}</span>
              )}
            </span>
            <strong>Carrito</strong>
          </Link>
        </div>
      </header>

      <div className="mk-pwrap">
        {/* Breadcrumb */}
        <nav className="mk-crumb" aria-label="Migas">
          <Link href="/">Inicio</Link>
          <Icon name="chevronRight" size={13} stroke={2} />
          <Link href={`/categorias/${catSlug}`}>{catNombre}</Link>
          <Icon name="chevronRight" size={13} stroke={2} />
          <span className="mk-crumb-now">
            {producto.nombre.length > 60 ? producto.nombre.slice(0, 60) + '…' : producto.nombre}
          </span>
        </nav>

        {/* Top: galería + buybox */}
        <section className="mk-ptop">
          {/* Galería */}
          <div className="mk-gallery">
            <div className="mk-gal-thumbs">
              {galeria.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className={'mk-gal-thumb' + (i === imagenActiva ? ' on' : '')}
                  onClick={() => setImagenActiva(i)}
                  aria-label={`Vista ${i + 1}`}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" />
                  ) : (
                    <span className="mk-gal-thumb-ph">
                      <Icon name="box" size={18} stroke={1.5} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="mk-gal-main">
              {galeria[imagenActiva] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={galeria[imagenActiva]!} alt={producto.nombre} />
              ) : (
                <div className="mk-gal-main-ph">
                  <Icon name="box" size={56} stroke={1.4} className="mk-gal-main-ph-ico" />
                  <span style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                    Sin foto disponible
                  </span>
                </div>
              )}
              {producto.ciudad && (
                <span className="mk-gal-loc">
                  <Icon name="mapPin" size={13} stroke={2} /> {producto.ciudad}
                </span>
              )}
              <span className={'mk-gal-cond' + (esNuevo ? '' : ' usado')}>
                {esNuevo ? 'Nuevo' : condicionLabel === 'reacondicionado' ? 'Reacondicionado' : 'Usado'}
              </span>
            </div>
          </div>

          {/* BuyBox */}
          <div className="mk-buybox">
            <span className="mk-bb-cat">{catNombre}</span>
            <h1 className="mk-bb-title">{producto.nombre}</h1>
            <div className="mk-bb-meta">
              <Stars value={rating} />
              <span className="mk-bb-rating-num">{rating}</span>
              <a href="#mk-reviews" className="mk-bb-link">{numResenas} reseñas</a>
              <span className="mk-bb-dot">·</span>
              <span className="mk-bb-sold">{sold.toLocaleString('es-PE')} vendidos</span>
            </div>

            {/* Card precio */}
            <div className="mk-bb-price-card">
              <div className="mk-bb-price">
                {fmt(precios.total)}
                {esMayoreo && (
                  <>
                    <span className="mk-bb-price-strike">{fmt(precioOriginalTotal)}</span>
                    {descuentoPct > 0 && <span className="mk-bb-price-discount">-{descuentoPct}%</span>}
                  </>
                )}
              </div>
              <div className="mk-bb-breakdown">
                <div className="mk-bb-bd-row"><span>Precio base</span><span>{fmt(precios.base)}</span></div>
                <div className="mk-bb-bd-row"><span>IGV 18%</span><span>{fmt(precios.igv)}</span></div>
                <div className="mk-bb-bd-row"><span>Tarifa Merkao 3%</span><span>{fmt(precios.tarifaServicio)}</span></div>
                <div className="mk-bb-bd-row total"><span>Total a pagar</span><span>{fmt(precios.total)}</span></div>
              </div>
            </div>

            {/* Badge mayoreo */}
            {esMayoreo && (
              <div className="mk-bb-mayoreo">
                <Icon name="checkCircle" size={16} stroke={1.9} />
                ¡Precio mayoreo activo! Comprando <strong>{cantidad}+</strong> unidades.
              </div>
            )}
            {!esMayoreo && producto.precio_mayoreo && producto.cantidad_minima_mayoreo && (
              <div className="mk-bb-mayoreo">
                <Icon name="tag" size={16} stroke={1.9} />
                Compra <strong>{producto.cantidad_minima_mayoreo}+</strong> unidades y paga{' '}
                <strong>{fmt(calcularPrecios(producto.precio_mayoreo).total)}</strong> c/u.
              </div>
            )}

            {/* Qty + stock */}
            <div className="mk-bb-buy-row">
              <div className="mk-bb-qty">
                <button type="button" onClick={decrementar} disabled={cantidad <= 1} aria-label="Menos">−</button>
                <span>{cantidad}</span>
                <button type="button" onClick={incrementar} disabled={cantidad >= producto.stock} aria-label="Más">+</button>
              </div>
              <span className={'mk-bb-stock' + (stockBajo ? ' low' : '')}>
                <span className="mk-bb-stock-dot" />
                {producto.stock === 0
                  ? 'Sin stock'
                  : stockBajo
                    ? `¡Últimas ${producto.stock} unidades!`
                    : `${producto.stock} disponibles`}
              </span>
            </div>

            {/* CTAs */}
            <div className="mk-bb-cta-row">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={producto.stock === 0}
                className="mk-btn mk-btn-primary mk-bb-buy"
                style={producto.stock === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                {producto.stock === 0 ? 'Sin stock' : 'Comprar ahora'}
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={producto.stock === 0}
                className={'mk-btn mk-btn-ghost mk-bb-add' + (added ? ' added' : '')}
              >
                <Icon name="cart" size={17} stroke={1.9} /> {added ? '¡Agregado!' : 'Al carrito'}
              </button>
              <button
                type="button"
                onClick={() => setFav((f) => !f)}
                className={'mk-bb-fav' + (fav ? ' on' : '')}
                aria-label="Guardar"
                aria-pressed={fav}
              >
                <Icon name="heart" size={19} stroke={2} />
              </button>
            </div>

            {/* Trust list */}
            <div className="mk-bb-trust">
              <div className="mk-bb-trust-row">
                <span className="mk-bb-trust-ico green">
                  <Icon name="shield" size={17} stroke={1.8} />
                </span>
                <div>
                  <strong>Compra protegida con Pago Escrow</strong>
                  <small>Tu dinero queda retenido hasta que confirmes la entrega.</small>
                </div>
              </div>
              <div className="mk-bb-trust-row">
                <span className="mk-bb-trust-ico">
                  <Icon name="truck" size={17} stroke={1.8} />
                </span>
                <div>
                  <strong>Envío a todo el Perú</strong>
                  <small>
                    {!producto.costo_envio || producto.costo_envio === 0
                      ? 'Flete a acordar con el vendedor · 3 a 6 días hábiles.'
                      : `Flete: ${fmt(producto.costo_envio)} · 3 a 6 días hábiles.`}
                  </small>
                </div>
              </div>
              <div className="mk-bb-trust-row">
                <span className="mk-bb-trust-ico">
                  <Icon name="checkCircle" size={17} stroke={1.8} />
                </span>
                <div>
                  <strong>Devolución garantizada</strong>
                  <small>Si no llega o no es lo descrito, te devolvemos el pago.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detalles + seller card */}
        <section className="mk-details">
          <div className="mk-det-main">
            <div className="mk-det-block">
              <h2>Descripción</h2>
              {producto.descripcion ? (
                <p style={{ whiteSpace: 'pre-line' }}>{producto.descripcion}</p>
              ) : (
                <p className="mk-det-empty">El vendedor no añadió una descripción para este producto.</p>
              )}
            </div>

            <div className="mk-det-block">
              <h2>Especificaciones</h2>
              <div className="mk-spec-grid">
                <div className="mk-spec-row"><span className="mk-spec-k">Categoría</span><span className="mk-spec-v">{catNombre}</span></div>
                <div className="mk-spec-row"><span className="mk-spec-k">Condición</span><span className="mk-spec-v" style={{ textTransform: 'capitalize' }}>{condicionLabel}</span></div>
                {producto.ciudad && (
                  <div className="mk-spec-row"><span className="mk-spec-k">Origen</span><span className="mk-spec-v">{producto.ciudad}, Perú</span></div>
                )}
                <div className="mk-spec-row"><span className="mk-spec-k">Stock</span><span className="mk-spec-v">{producto.stock} unidades</span></div>
                {producto.precio_mayoreo && producto.cantidad_minima_mayoreo && (
                  <div className="mk-spec-row">
                    <span className="mk-spec-k">Precio mayoreo</span>
                    <span className="mk-spec-v">{fmt(calcularPrecios(producto.precio_mayoreo).total)} desde {producto.cantidad_minima_mayoreo} und.</span>
                  </div>
                )}
                <div className="mk-spec-row">
                  <span className="mk-spec-k">Envío</span>
                  <span className="mk-spec-v">
                    {!producto.costo_envio || producto.costo_envio === 0
                      ? 'A acordar con el vendedor'
                      : fmt(producto.costo_envio)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Side seller card */}
          <aside className="mk-det-side">
            <div className="mk-seller-card">
              <div className="mk-seller-head">
                <div className="mk-seller-avatar">
                  {(producto.ciudad ?? 'M').slice(0, 2).toUpperCase()}
                </div>
                <div className="mk-seller-info">
                  <div className="mk-seller-name">
                    Tienda Merkao
                    <span className="mk-seller-verif">
                      <Icon name="checkCircle" size={12} /> Verificado
                    </span>
                  </div>
                  <div className="mk-seller-sub">
                    <Icon name="mapPin" size={12} stroke={2} />
                    {producto.ciudad ? `${producto.ciudad}, Perú` : 'Perú'}
                  </div>
                </div>
              </div>
              <div className="mk-seller-stats">
                <div className="mk-seller-stat">
                  <strong>{rating}</strong>
                  <span><Icon name="star" size={11} className="mk-star on" /> Rating</span>
                </div>
                <div className="mk-seller-stat">
                  <strong>98%</strong>
                  <span>Buenas ventas</span>
                </div>
                <div className="mk-seller-stat">
                  <strong>{sold}</strong>
                  <span>Vendidos</span>
                </div>
              </div>
              <div className="mk-seller-actions">
                <Link
                  href={producto.vendedor_id ? `/tienda/${producto.vendedor_id}` : '#'}
                  className="mk-btn mk-btn-ghost"
                >
                  <Icon name="store" size={15} stroke={1.8} /> Ver tienda
                </Link>
                <Link href="/contacto" className="mk-btn mk-btn-ghost">
                  <Icon name="message" size={15} stroke={1.8} /> Contactar
                </Link>
              </div>
            </div>
          </aside>
        </section>

        {/* Reseñas */}
        <section className="mk-reviews" id="mk-reviews">
          <h2>Reseñas de compradores</h2>
          <div className="mk-rev-wrap">
            <div className="mk-rev-summary">
              <div className="mk-rev-big">{rating}</div>
              <Stars value={rating} size={16} />
              <span className="mk-rev-count">{numResenas} reseñas verificadas</span>
              <div className="mk-rev-dist">
                {distribucion.map(([star, pct]) => (
                  <div className="mk-rev-dist-row" key={star}>
                    <span className="mk-rev-dist-star">
                      {star} <Icon name="star" size={11} className="mk-star on" />
                    </span>
                    <div className="mk-rev-dist-bar"><div style={{ width: pct + '%' }} /></div>
                    <span className="mk-rev-dist-pct">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mk-rev-list">
              {[
                { autor: 'María Q.', loc: 'Arequipa', estrellas: 5, fecha: 'hace 3 días', txt: 'Hermoso producto, llegó bien empaquetado y en 4 días. La calidad es la que esperaba. Muy recomendado.' },
                { autor: 'Carlos M.', loc: 'Lima', estrellas: 5, fecha: 'hace 1 semana', txt: 'Excelente acabado. El pago con Escrow me dio mucha confianza para comprar a un vendedor nuevo.' },
                { autor: 'Ana T.', loc: 'Trujillo', estrellas: 4, fecha: 'hace 2 semanas', txt: 'Muy bonito, llegó tal cual se ve en la foto. La talla me quedó un poco grande pero el material es buenísimo.' },
              ].map((r, i) => (
                <article className="mk-rev-item" key={i}>
                  <div className="mk-rev-item-head">
                    <div className="mk-rev-avatar">{r.autor[0]}</div>
                    <div className="mk-rev-who">
                      <strong>{r.autor}</strong>
                      <span className="mk-rev-loc"><Icon name="mapPin" size={11} stroke={2} /> {r.loc}</span>
                    </div>
                    <span className="mk-rev-verif">
                      <Icon name="checkCircle" size={13} /> Compra verificada
                    </span>
                  </div>
                  <div className="mk-rev-item-meta">
                    <Stars value={r.estrellas} />
                    <span className="mk-rev-date">{r.fecha}</span>
                  </div>
                  <p className="mk-rev-txt">{r.txt}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Related */}
        {relacionados.length > 0 && (
          <section className="mk-related">
            <div>
              <h2>Productos relacionados</h2>
              <p className="mk-related-sub">Más {catNombre.toLowerCase()} que podrían gustarte.</p>
            </div>
            <div className="mk-rgrid">
              {relacionados.map((r) => {
                const p = calcularPrecios(r.precio)
                const img = r.imagenes?.[0] ?? `https://picsum.photos/seed/${r.id}/600/600`
                const rCat = CAT_BY_ID[r.categoria_id]?.nombre ?? ''
                return (
                  <Link key={r.id} href={`/productos/${r.id}`} className="mk-rcard mk-rcard-link">
                    <div className="mk-rcard-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={r.nombre} loading="lazy" />
                      {r.ciudad && (
                        <span className="mk-rcard-loc">
                          <Icon name="mapPin" size={11} stroke={2} /> {r.ciudad}
                        </span>
                      )}
                    </div>
                    <div className="mk-rcard-body">
                      <span className="mk-rcard-cat">{rCat}</span>
                      <h3 className="mk-rcard-title">{r.nombre}</h3>
                      <div className="mk-rcard-price">{fmt(p.total)}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
