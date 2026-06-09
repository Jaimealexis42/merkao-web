'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt } from '@/lib/precios'
import { Icon, type IconName } from '@/lib/icons'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'

type Tienda = {
  id: string
  nombre: string | null
  descripcion: string | null
  logo_url: string | null
  ciudad: string | null
  reputacion: number | null
  ventas_totales: number | null
}

type Producto = {
  id: string
  nombre: string
  precio: number
  precio_mayoreo: number | null
  cantidad_minima_mayoreo: number | null
  costo_envio: number | null
  categoria_id: number
  condicion: string | null
  stock: number
  imagenes: string[] | null
  ciudad: string | null
  vistas: number | null
  estado: string
}

type CatDef = { id: number; nombre: string; icon: IconName }

const CATEGORIAS: CatDef[] = [
  { id: 1, nombre: 'Ropa y moda',   icon: 'shirt' },
  { id: 2, nombre: 'Electrónicos',  icon: 'smartphone' },
  { id: 3, nombre: 'Alimentos',     icon: 'food' },
  { id: 4, nombre: 'Artesanías',    icon: 'palette' },
  { id: 5, nombre: 'Hogar',         icon: 'home' },
  { id: 6, nombre: 'Autos y motos', icon: 'car' },
  { id: 7, nombre: 'Agrícola',      icon: 'sprout' },
  { id: 8, nombre: 'Otros',         icon: 'box' },
]
const CAT_BY_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]))

type SortKey = 'recientes' | 'vistos' | 'precio_asc' | 'precio_desc'
const SORT_LABELS: Record<SortKey, string> = {
  recientes: 'Más recientes',
  vistos: 'Más vistos',
  precio_asc: 'Precio: menor a mayor',
  precio_desc: 'Precio: mayor a menor',
}

function iniciales(nombre: string | null | undefined): string {
  const n = (nombre ?? 'M').trim()
  const partes = n.split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'M'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

export default function TiendaPublicaPage() {
  const { id } = useParams<{ id: string }>()

  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<number>(0)
  const [sort, setSort] = useState<SortKey>('recientes')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      const [tiendaRes, productosRes] = await Promise.all([
        supabase
          .from('tiendas')
          .select('id, nombre, descripcion, logo_url, ciudad, reputacion, ventas_totales')
          .eq('vendedor_id', id)
          .maybeSingle(),
        supabase
          .from('productos')
          .select(
            'id, nombre, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, categoria_id, condicion, stock, imagenes, ciudad, vistas, estado',
          )
          .eq('vendedor_id', id)
          .eq('estado', 'activo')
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setTienda(
        (tiendaRes.data as Tienda | null) ??
          { id, nombre: null, descripcion: null, logo_url: null, ciudad: null, reputacion: null, ventas_totales: null },
      )
      setProductos((productosRes.data ?? []) as Producto[])
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [id])

  const nombreVisible = tienda?.nombre || 'Tienda en Merkao'
  const ciudadVisible = tienda?.ciudad || (productos[0]?.ciudad ?? 'Perú')
  const reputacion = tienda?.reputacion ?? 4.7
  const ventasTotales = tienda?.ventas_totales ?? 0
  const productosActivos = productos.length

  const categoriasUsadas = useMemo(() => {
    const set = new Set<number>()
    productos.forEach((p) => set.add(p.categoria_id))
    return CATEGORIAS.filter((c) => set.has(c.id))
  }, [productos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const items = productos.filter((p) => {
      if (q && !p.nombre.toLowerCase().includes(q)) return false
      if (categoria !== 0 && p.categoria_id !== categoria) return false
      return true
    })
    if (sort === 'precio_asc') items.sort((a, b) => a.precio - b.precio)
    else if (sort === 'precio_desc') items.sort((a, b) => b.precio - a.precio)
    else if (sort === 'vistos') items.sort((a, b) => (b.vistas ?? 0) - (a.vistas ?? 0))
    return items
  }, [productos, busqueda, categoria, sort])

  return (
    <>
      <SiteTopnav active={null} />

      <main className="mk-stf">
        <nav className="mk-crumb-row" aria-label="Migas">
          <Link href="/">Inicio</Link>
          <Icon name="chevronRight" size={12} stroke={2} />
          <span>Tiendas</span>
          <Icon name="chevronRight" size={12} stroke={2} />
          <span className="on">{nombreVisible}</span>
        </nav>

        {/* Hero storefront */}
        <section className="mk-stf-hero">
          <div className="mk-stf-logo">
            {tienda?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tienda.logo_url} alt={nombreVisible} />
            ) : (
              <span>{iniciales(tienda?.nombre)}</span>
            )}
          </div>

          <div className="mk-stf-id">
            <h1>
              {nombreVisible}
              <span className="mk-stf-verif">
                <Icon name="checkCircle" size={12} stroke={2} /> Verificado
              </span>
            </h1>
            <span className="mk-stf-loc">
              <Icon name="mapPin" size={13} stroke={2} /> {ciudadVisible}, Perú
            </span>
            {tienda?.descripcion ? (
              <p className="mk-stf-desc" style={{ whiteSpace: 'pre-line' }}>{tienda.descripcion}</p>
            ) : (
              <p className="mk-stf-desc" style={{ color: 'var(--muted)' }}>
                Tienda en Merkao con Pago Escrow protegido en cada compra.
              </p>
            )}
            <div className="mk-stf-cta">
              <Link href="/contacto" className="mk-btn mk-btn-ghost">
                <Icon name="message" size={15} stroke={1.9} /> Contactar
              </Link>
              <Link href="/como-funciona-escrow" className="mk-btn mk-btn-ghost">
                <Icon name="shield" size={15} stroke={1.9} /> Sobre el Pago Escrow
              </Link>
            </div>
          </div>

          <div className="mk-stf-stats">
            <div className="mk-stf-stat brand">
              <div className="v">{productosActivos}</div>
              <div className="l">Productos</div>
            </div>
            <div className="mk-stf-stat green">
              <div className="v">{ventasTotales}</div>
              <div className="l">Ventas</div>
            </div>
            <div className="mk-stf-stat">
              <div className="v">
                {reputacion.toFixed(1)}<small style={{ fontSize: 12, color: 'var(--muted-2)', fontWeight: 600 }}>/5</small>
              </div>
              <div className="l">Reputación</div>
            </div>
          </div>
        </section>

        {/* Reputación bar */}
        <div className="mk-stf-rep">
          <Icon name="star" size={16} className="mk-star on" />
          <span>
            <strong>Reputación del vendedor:</strong> {reputacion.toFixed(1)} de 5
          </span>
          <div className="mk-stf-rep-bar">
            <div style={{ width: `${Math.min(100, (reputacion / 5) * 100)}%` }} />
          </div>
        </div>

        {/* Toolbar productos */}
        <div className="mk-stf-toolbar">
          <h2>Productos de la tienda</h2>
          <div className="mk-cat-search">
            <Icon name="search" size={16} stroke={2} />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en esta tienda…"
            />
          </div>
          {categoriasUsadas.length > 1 && (
            <div className="mk-cat-sort">
              <span>Categoría:</span>
              <select value={categoria} onChange={(e) => setCategoria(Number(e.target.value))}>
                <option value={0}>Todas</option>
                {categoriasUsadas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mk-cat-sort">
            <span>Ordenar:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="mk-prod-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mk-skel">
                <div className="mk-skel-img" />
                <div className="mk-skel-body">
                  <div className="mk-skel-line w50" />
                  <div className="mk-skel-line w90" />
                  <div className="mk-skel-line w70" />
                </div>
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="mk-stf-empty">
            <Icon name="box" size={48} stroke={1.4} style={{ color: 'var(--muted-2)', margin: '0 auto 14px' }} />
            <h3>
              {productos.length === 0
                ? 'Esta tienda aún no tiene productos activos'
                : 'No encontramos productos con esos filtros'}
            </h3>
            <p>
              {productos.length === 0
                ? 'Vuelve más tarde para descubrir lo que el vendedor publique.'
                : 'Prueba quitar la búsqueda o cambiar de categoría.'}
            </p>
            {productos.length > 0 && (
              <button
                type="button"
                onClick={() => { setBusqueda(''); setCategoria(0); setSort('recientes') }}
                className="mk-btn mk-btn-ghost"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="mk-prod-grid">
            {filtrados.map((prod) => {
              const p = calcularPrecios(prod.precio)
              const img = prod.imagenes?.[0] ?? `https://picsum.photos/seed/${prod.id}/600/600`
              const catNombre = CAT_BY_ID[prod.categoria_id]?.nombre ?? ''
              const tieneMayoreo = !!(prod.precio_mayoreo && prod.cantidad_minima_mayoreo)
              const sinStock = prod.stock <= 0
              return (
                <article key={prod.id} className="mk-card">
                  <Link href={`/productos/${prod.id}`} className="mk-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={prod.nombre} loading="lazy" />
                    {!sinStock && prod.stock <= 5 && (
                      <span className="mk-card-stock">¡Últimas {prod.stock}!</span>
                    )}
                    {prod.ciudad && (
                      <span className="mk-card-loc">
                        <Icon name="mapPin" size={12} stroke={2} /> {prod.ciudad}
                      </span>
                    )}
                  </Link>
                  <div className="mk-card-body">
                    <span className="mk-card-cat">{catNombre}</span>
                    <Link href={`/productos/${prod.id}`} className="mk-card-title-link">
                      <h3 className="mk-card-title">{prod.nombre}</h3>
                    </Link>
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
                      {sinStock ? (
                        <button type="button" disabled className="mk-btn mk-btn-ghost" style={{ opacity: 0.55, cursor: 'not-allowed' }}>
                          Sin stock
                        </button>
                      ) : (
                        <Link href={`/checkout?id=${prod.id}`} className="mk-btn mk-btn-primary">
                          Comprar ahora
                        </Link>
                      )}
                      <Link href={`/productos/${prod.id}`} className="mk-btn mk-btn-ghost">
                        <Icon name="eye" size={16} /> Ver detalle
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <SiteFootnav />
    </>
  )
}
