// Índice de todas las categorías de Merkao.
// Llega aquí desde el botón "Todas las categorías" del header del home.

import Link from 'next/link'
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

export const metadata = {
  title: 'Categorías | Merkao',
  description: 'Explora todas las categorías del marketplace peruano: ropa, electrónicos, alimentos, artesanías y más.',
}

export default function CategoriasIndexPage() {
  return (
    <>
      <SiteTopnav active={null} />

      <main className="mk-cat">
        <nav className="mk-crumb-row" aria-label="Migas">
          <Link href="/">Inicio</Link>
          <Icon name="chevronRight" size={12} stroke={2} />
          <span className="on">Categorías</span>
        </nav>

        <section className="mk-cat-hero">
          <div className="mk-cat-hero-ico">
            <Icon name="menu" size={28} stroke={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1>Todas las categorías</h1>
            <p>Descubre todo lo que se vende en Merkao, organizado por rubro. Todas las compras están protegidas con Pago Escrow.</p>
          </div>
          <div className="mk-cat-hero-cnt">
            <div className="v">{CATEGORIAS.length}</div>
            <div className="l">categorías</div>
          </div>
        </section>

        <div className="mk-cat-grid" style={{ marginTop: 24 }}>
          {CATEGORIAS.map((c) => (
            <Link key={c.id} href={`/categorias/${c.slug}`} className="mk-cat-tile">
              <span className="mk-cat-tile-ico"><Icon name={c.icon} size={26} stroke={1.6} /></span>
              <span className="mk-cat-tile-label">{c.nombre}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4, marginTop: 4, padding: '0 6px', fontWeight: 500 }}>
                {c.descripcion}
              </span>
            </Link>
          ))}
        </div>
      </main>

      <SiteFootnav />
    </>
  )
}
