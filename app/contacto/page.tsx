'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/lib/icons'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgoqbdeo'

type Tipo = 'sugerencia' | 'reclamo' | 'consulta' | 'vendedor'

const TIPO_LABEL: Record<Tipo, string> = {
  sugerencia: 'Sugerencia',
  reclamo: 'Reclamo',
  consulta: 'Consulta general',
  vendedor: 'Quiero vender en Merkao',
}

type Feat = { icon: IconName; tone: 'brand' | 'green'; text: string }

const BRAND_FEATS: Feat[] = [
  { icon: 'message', tone: 'brand', text: 'Sugerencias, reclamos o consultas' },
  { icon: 'store', tone: 'brand', text: '¿Quieres vender en Merkao? Escríbenos' },
  { icon: 'shield', tone: 'green', text: 'Pago protegido con Escrow en cada compra' },
  { icon: 'clock', tone: 'brand', text: 'Respuesta en 24-48 horas hábiles' },
]

export default function ContactoPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState<Tipo>('consulta')
  const [mensaje, setMensaje] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setNombre('')
    setEmail('')
    setTipo('consulta')
    setMensaje('')
    setSent(false)
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setError(null)

    const nombreT = nombre.trim()
    const emailT = email.trim()
    const mensajeT = mensaje.trim()

    if (nombreT.length < 2) {
      setError('Tu nombre debe tener al menos 2 caracteres.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailT)) {
      setError('Por favor ingresa un email válido.')
      return
    }
    if (mensajeT.length < 10) {
      setError('Tu mensaje debe tener al menos 10 caracteres.')
      return
    }
    if (mensajeT.length > 4000) {
      setError('Tu mensaje supera el límite de 4000 caracteres.')
      return
    }

    setSending(true)
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreT,
          email: emailT,
          tipo: TIPO_LABEL[tipo],
          mensaje: mensajeT,
          _subject: `Mensaje desde Merkao.org · ${TIPO_LABEL[tipo]}`,
          _replyto: emailT,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> }
      if (!res.ok) {
        const msg = data.errors?.[0]?.message ?? `Error ${res.status}`
        throw new Error(msg)
      }
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar tu mensaje.'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mk-auth">
      {/* ── Brand column ── */}
      <aside className="mk-auth-brand">
        <div className="mk-auth-brand-bg" aria-hidden />

        <Link href="/" className="mk-auth-logo">
          merkao<span>.pe</span>
        </Link>

        <div className="mk-auth-brand-mid">
          <span
            className="mk-eyebrow"
            style={{ background: 'rgba(255,255,255,.08)', color: '#fff', marginBottom: 18, display: 'inline-flex' }}
          >
            <Icon name="message" size={13} stroke={2} /> Contacto
          </span>
          <h1>
            Conversemos. <b>Estamos aquí</b> para ayudarte.
          </h1>
          <p>
            Sugerencias, reclamos, consultas o si quieres abrir tu tienda en Merkao —
            cuéntanos y te respondemos rápido.
          </p>

          <div className="mk-auth-feats">
            {BRAND_FEATS.map((f) => (
              <div key={f.text} className="mk-auth-feat">
                <Icon name={f.icon} size={20} stroke={2} className={f.tone === 'green' ? 'af-green' : ''} />
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mk-auth-brand-foot">
          <Icon name="lock" size={14} /> Tus datos están seguros · Hecho en Perú 🇵🇪
        </div>
      </aside>

      {/* ── Form column ── */}
      <main className="mk-auth-form-wrap">
        <div className="mk-auth-card" style={{ maxWidth: 460 }}>
          <Link href="/" className="mk-auth-back">
            <Icon name="chevronLeft" size={14} /> Volver al marketplace
          </Link>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  background: 'var(--green-tint)',
                  color: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 18px',
                }}
              >
                <Icon name="checkCircle" size={34} stroke={1.8} />
              </div>
              <h2 className="mk-auth-h">¡Mensaje enviado!</h2>
              <p className="mk-auth-sub" style={{ marginBottom: 24 }}>
                Gracias por escribirnos. Te responderemos a{' '}
                <strong style={{ color: 'var(--ink)' }}>{email}</strong> en 24-48 horas hábiles.
              </p>
              <button type="button" onClick={reset} className="mk-btn mk-btn-primary mk-auth-submit">
                Enviar otro mensaje <Icon name="arrowRight" size={16} />
              </button>
            </div>
          ) : (
            <>
              <h2 className="mk-auth-h">¿En qué te podemos ayudar?</h2>
              <p className="mk-auth-sub">
                También puedes escribirnos directo a{' '}
                <a href="mailto:contacto@merkao.org" style={{ color: 'var(--brand-700)', fontWeight: 700 }}>
                  contacto@merkao.org
                </a>
                .
              </p>

              <div className="mk-contacto-cta">
                <Icon name="message" size={16} stroke={2} />
                <span>
                  Respuesta rápida a <a href="mailto:contacto@merkao.org">contacto@merkao.org</a>
                </span>
              </div>

              {error && (
                <div className="mk-auth-error">
                  <Icon name="lock" size={14} /> {error}
                </div>
              )}

              <form onSubmit={submit}>
                <div className="mk-field-row-2">
                  <label className="mk-field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      maxLength={100}
                      required
                      placeholder="¿Cómo te llamas?"
                      disabled={sending}
                      autoComplete="name"
                    />
                  </label>
                  <label className="mk-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={150}
                      required
                      placeholder="tu@correo.com"
                      disabled={sending}
                      autoComplete="email"
                    />
                  </label>
                </div>

                <label className="mk-field">
                  <span>Tipo de mensaje</span>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as Tipo)}
                    disabled={sending}
                  >
                    <option value="sugerencia">{TIPO_LABEL.sugerencia}</option>
                    <option value="reclamo">{TIPO_LABEL.reclamo}</option>
                    <option value="consulta">{TIPO_LABEL.consulta}</option>
                    <option value="vendedor">{TIPO_LABEL.vendedor}</option>
                  </select>
                </label>

                <label className="mk-field">
                  <span>Mensaje</span>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={5}
                    minLength={10}
                    maxLength={4000}
                    required
                    placeholder="Cuéntanos en qué te podemos ayudar…"
                    disabled={sending}
                  />
                  <small className="mk-field-hint" style={{ textAlign: 'right', display: 'block' }}>
                    {mensaje.length}/4000
                  </small>
                </label>

                <button
                  type="submit"
                  disabled={sending}
                  className="mk-btn mk-btn-primary mk-auth-submit"
                  style={sending ? { opacity: 0.7, cursor: 'wait' } : undefined}
                >
                  {sending ? 'Enviando…' : 'Enviar mensaje'}
                  {!sending && <Icon name="arrowRight" size={16} />}
                </button>
              </form>

              <div className="mk-info-grid">
                <div className="mk-info-card">
                  <span className="mk-info-card-ico">
                    <Icon name="clock" size={18} stroke={1.9} />
                  </span>
                  <div>
                    <strong>Respuesta rápida</strong>
                    <span>Te contestamos en 24-48 horas hábiles a tu email.</span>
                  </div>
                </div>
                <div className="mk-info-card">
                  <span className="mk-info-card-ico green">
                    <Icon name="shield" size={18} stroke={1.9} />
                  </span>
                  <div>
                    <strong>Hecho en Perú 🇵🇪</strong>
                    <span>Marketplace 100% peruano con Pago Escrow protegido.</span>
                  </div>
                </div>
              </div>

              <p className="mk-auth-foot-note">
                Al escribirnos aceptas que respondamos al email que ingresaste. No compartimos
                tus datos con terceros.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
