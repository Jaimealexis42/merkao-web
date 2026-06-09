import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon, type IconName } from '@/lib/icons'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'

export const metadata: Metadata = {
  title: 'Merkao — Cómo funciona el Pago Escrow',
  description:
    'Con el Pago Escrow de Merkao, retenemos el dinero del comprador hasta que confirme que recibió su producto. Compra y vende sin miedo.',
}

const STEPS: { icon: IconName; h: string; p: string }[] = [
  { icon: 'card', h: 'Pagas', p: 'Compras y pagas con Yape, Plin, tarjeta o transferencia.' },
  { icon: 'lock', h: 'Retenemos', p: 'Merkao guarda el dinero. El vendedor aún no lo recibe.' },
  { icon: 'truck', h: 'Envía', p: 'El vendedor despacha tu producto a todo el Perú.' },
  { icon: 'home', h: 'Confirmas', p: 'Recibes tu pedido y confirmas que está todo bien.' },
  { icon: 'wallet', h: 'Liberamos', p: 'Recién ahí el vendedor recibe su pago. Todos ganan.' },
]

const BENEFITS: { tone: '' | 'g' | 'n'; icon: IconName; h: string; p: string }[] = [
  {
    tone: '',
    icon: 'shield',
    h: 'Para el comprador',
    p: 'Nunca pagas a ciegas. Si tu producto no llega o no es lo prometido, te devolvemos el dinero. Compra con total tranquilidad.',
  },
  {
    tone: 'g',
    icon: 'store',
    h: 'Para el vendedor',
    p: 'Cobras seguro. El comprador ya pagó y el dinero está garantizado: solo despachas y confirmamos. Sin estafas ni contracargos.',
  },
  {
    tone: 'n',
    icon: 'clock',
    h: 'Resolución justa',
    p: '¿Algún problema? Nuestro equipo media entre ambas partes con evidencia, y resuelve de forma justa y rápida.',
  },
]

const FAQ = [
  {
    open: true,
    q: '¿Cuándo recibe el vendedor su dinero?',
    a: 'El vendedor recibe el pago apenas el comprador confirma que recibió el producto en buen estado. Si el comprador no confirma, el pago se libera automáticamente a los 7 días de la entrega registrada.',
  },
  {
    open: false,
    q: '¿Qué pasa si mi pedido no llega?',
    a: 'Como tu dinero sigue retenido por Merkao, no lo pierdes. Abres un reclamo, revisamos el caso y te devolvemos el 100% del pago.',
  },
  {
    open: false,
    q: '¿Tiene algún costo el Pago Escrow?',
    a: 'Para el comprador es totalmente gratis. Para el vendedor, la comisión es de 0% durante los primeros 12 meses.',
  },
  {
    open: false,
    q: '¿Con qué métodos puedo pagar?',
    a: 'Aceptamos Yape, Plin, tarjetas Visa/Mastercard y transferencia bancaria. Todos pasan por el Pago Escrow de Merkao.',
  },
]

export default function ComoFuncionaEscrowPage() {
  return (
    <>
      <SiteTopnav active="escrow" />

      <section className="esc-hero">
        <div className="esc-hero-inner">
          <div>
            <span className="mk-eyebrow">
              <Icon name="shield" size={14} stroke={2} /> Compra y vende sin miedo
            </span>
            <h1>
              Tu dinero <b>protegido</b> en cada compra
            </h1>
            <p>
              Con el Pago Escrow de Merkao, retenemos el dinero del comprador hasta
              que confirme que recibió su producto. Si algo sale mal, lo devolvemos.
              Así de simple.
            </p>
            <div className="esc-hero-cta">
              <Link className="mk-btn mk-btn-primary mk-btn-lg" href="/">
                Empezar a comprar
              </Link>
              <Link
                className="mk-btn mk-btn-ghost mk-btn-lg"
                href="/vende"
                style={{
                  background: 'transparent',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,.3)',
                }}
              >
                Quiero vender
              </Link>
            </div>
          </div>
          <div className="esc-hero-art">
            <div className="esc-shield">
              <span className="esc-shield-ico">
                <Icon name="shield" size={30} stroke={1.8} />
              </span>
              <div>
                <strong>Pago Escrow Merkao</strong>
                <span>Intermediario de confianza entre comprador y vendedor</span>
              </div>
            </div>
            <div className="esc-mini">
              <div className="esc-mini-card">
                <div className="n">100%</div>
                <span>del pago retenido hasta tu confirmación</span>
              </div>
              <div className="esc-mini-card">
                <div className="n">0%</div>
                <span>comisión por 12 meses para vendedores</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="esc-sec">
        <div className="esc-sec-head">
          <span className="mk-eyebrow">Cómo funciona</span>
          <h2 className="mk-section-title">5 pasos, una sola tranquilidad</h2>
          <p className="mk-section-lead">
            Desde que pagas hasta que el vendedor recibe su dinero, Merkao protege cada etapa.
          </p>
        </div>
        <div className="esc-steps">
          {STEPS.map((s, i) => (
            <div key={s.h} className="esc-step">
              <div className="esc-step-num">{i + 1}</div>
              <div className="esc-step-ico">
                <Icon name={s.icon} size={18} stroke={2} />
              </div>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="esc-sec esc-bens">
        <div className="esc-sec-head">
          <span className="mk-eyebrow">Por qué importa</span>
          <h2 className="mk-section-title">Confianza para ambos lados</h2>
        </div>
        <div className="esc-ben-grid">
          {BENEFITS.map((b) => (
            <div key={b.h} className={'esc-ben' + (b.tone ? ' ' + b.tone : '')}>
              <div className="esc-ben-ico">
                <Icon name={b.icon} size={24} stroke={1.8} />
              </div>
              <h3>{b.h}</h3>
              <p>{b.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="esc-sec">
        <div className="esc-sec-head">
          <span className="mk-eyebrow">Preguntas frecuentes</span>
          <h2 className="mk-section-title">Todo lo que te preguntas</h2>
        </div>
        <div className="esc-faq">
          {FAQ.map((f) => (
            <details key={f.q} className="esc-q" open={f.open}>
              <summary>
                {f.q}
                <span className="chev" aria-hidden>
                  <Icon name="chevronDown" size={18} stroke={2} />
                </span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="esc-band">
        <h2>Compra y vende sin miedo</h2>
        <p>Únete a Merkao y siente la diferencia de tener tu dinero siempre protegido.</p>
        <Link className="mk-btn mk-btn-lg" href="/register">
          Crear mi cuenta gratis
        </Link>
      </section>

      <SiteFootnav />
    </>
  )
}
