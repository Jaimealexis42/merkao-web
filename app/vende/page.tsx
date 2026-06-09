import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/lib/icons'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'

export const metadata: Metadata = {
  title: 'Merkao — Vende en Merkao',
  description:
    'Abre tu tienda gratis y vende a todo el Perú con pago protegido. 0% de comisión por lanzamiento.',
}

const BARS = [42, 58, 38, 71, 88, 64, 100]

const BENEFITS = [
  {
    tone: 'g' as const,
    icon: 'shield' as const,
    title: 'Cobra seguro',
    body:
      'Con el Pago Escrow, el comprador paga por adelantado y el dinero está garantizado. Tú solo despachas. Sin estafas ni contracargos.',
  },
  {
    tone: '' as const,
    icon: 'bars' as const,
    title: 'Panel completo',
    body:
      'Gestiona productos, pedidos, mensajes, pagos y reseñas desde un solo lugar, con estadísticas claras de tu negocio.',
  },
  {
    tone: 'n' as const,
    icon: 'truck' as const,
    title: 'Llega a todo el Perú',
    body:
      'Vende desde tu pueblo o ciudad a clientes en las 24 regiones. Tú defines tus opciones de envío y cobertura.',
  },
]

const STEPS = [
  { n: 1, h: 'Crea tu cuenta', p: 'Regístrate gratis como vendedor en minutos.' },
  { n: 2, h: 'Publica tus productos', p: 'Sube fotos, precio y stock. Calculamos el IGV por ti.' },
  { n: 3, h: 'Recibe pedidos', p: 'Te avisamos de cada venta con el pago ya garantizado.' },
  { n: 4, h: 'Despacha y cobra', p: 'Envías, el cliente confirma y recibes tu dinero.' },
]

const PRICE_FEATURES = [
  'Publicaciones ilimitadas',
  'Pago Escrow incluido',
  'Panel y estadísticas completas',
  'Soporte para vendedores',
]

export default function VendePage() {
  const ctaHref = '/register?role=vendedor'

  return (
    <>
      <SiteTopnav active="vende" />

      <section className="vd-hero">
        <div className="vd-hero-inner">
          <div>
            <span className="mk-eyebrow">
              <Icon name="store" size={14} stroke={2} /> Vende en Merkao
            </span>
            <h1 style={{ marginTop: 14 }}>
              Convierte lo que haces en un <b>negocio nacional</b>
            </h1>
            <p>
              Abre tu tienda gratis y vende a todo el Perú con pago protegido.
              Sin comisiones por lanzamiento, sin complicaciones.
            </p>
            <div className="vd-hero-cta">
              <Link className="mk-btn mk-btn-primary mk-btn-lg" href={ctaHref}>
                Abrir mi tienda gratis
              </Link>
              <span className="vd-hero-note">
                <Icon name="check" size={16} stroke={2.2} /> Listo en 5 minutos
              </span>
            </div>
          </div>
          <div className="vd-hero-art">
            <div className="vd-art-head">
              <span className="vd-art-avatar">TA</span>
              <div>
                <strong>Tejidos Andinos</strong>
                <span>● Vendedor verificado</span>
              </div>
            </div>
            <div className="vd-art-stats">
              <div className="vd-art-stat">
                <div className="l">Ventas del mes</div>
                <div className="v">S/ 12,480</div>
              </div>
              <div className="vd-art-stat">
                <div className="l">Crecimiento</div>
                <div className="v up">+18.2%</div>
              </div>
            </div>
            <div className="vd-art-chart">
              {BARS.map((h, i) => (
                <div key={i} className="vd-art-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="vd-trust">
        <div className="vd-trust-inner">
          <div className="vd-trust-item">
            <div className="n"><b>0%</b></div>
            <span>comisión por lanzamiento</span>
          </div>
          <div className="vd-trust-item">
            <div className="n">24 <b>regiones</b></div>
            <span>de cobertura nacional</span>
          </div>
          <div className="vd-trust-item">
            <div className="n">100%</div>
            <span>pagos protegidos por Escrow</span>
          </div>
          <div className="vd-trust-item">
            <div className="n">5 min</div>
            <span>para abrir tu tienda</span>
          </div>
        </div>
      </section>

      <section className="vd-sec">
        <div className="vd-sec-head">
          <span className="mk-eyebrow">Por qué Merkao</span>
          <h2 className="mk-section-title">Todo lo que necesitas para vender más</h2>
          <p className="mk-section-lead">
            Herramientas simples y pago seguro, pensados para el emprendedor peruano.
          </p>
        </div>
        <div className="vd-bens">
          {BENEFITS.map((b) => (
            <div key={b.title} className={'vd-ben' + (b.tone ? ' ' + b.tone : '')}>
              <div className="vd-ben-ico">
                <Icon name={b.icon} size={24} stroke={1.8} />
              </div>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vd-sec vd-steps-wrap">
        <div className="vd-sec-head">
          <span className="mk-eyebrow">Empezar es fácil</span>
          <h2 className="mk-section-title">Tu tienda lista en 4 pasos</h2>
        </div>
        <div className="vd-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="vd-step">
              <div className="vd-step-num">{s.n}</div>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vd-sec">
        <div className="vd-price">
          <div className="vd-price-card">
            <span className="vd-price-tag">Promoción de lanzamiento</span>
            <div className="vd-price-num">
              0%<small> comisión</small>
            </div>
            <h3>Vende sin pagar comisiones</h3>
            <p>
              Durante nuestro lanzamiento, te quedas con el 100% de tus ventas.
              Sin costos ocultos, sin mensualidad.
            </p>
            <div className="vd-price-list">
              {PRICE_FEATURES.map((f) => (
                <div key={f} className="vd-price-li">
                  <Icon name="check" size={14} stroke={2.5} /> {f}
                </div>
              ))}
            </div>
            <Link className="mk-btn mk-btn-lg" href={ctaHref}>
              Abrir mi tienda gratis
            </Link>
          </div>
        </div>
      </section>

      <section className="vd-band">
        <h2>Tu próximo cliente te está esperando</h2>
        <p>Miles de peruanos compran en Merkao cada semana. Empieza a vender hoy mismo.</p>
        <Link className="mk-btn mk-btn-lg" href={ctaHref}>
          Crear mi tienda gratis
        </Link>
      </section>

      <SiteFootnav />
    </>
  )
}
