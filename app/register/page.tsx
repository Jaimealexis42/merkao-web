'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Icon, type IconName } from '@/lib/icons'

type Rol = 'comprador' | 'vendedor'

type Feat = { icon: IconName; tone: 'brand' | 'green'; text: string }

const FEATS: Record<Rol, { title: string; tag: string; lead: string; feats: Feat[] }> = {
  comprador: {
    tag: 'Compra protegida con Escrow',
    title: 'Compra en todo el <b>Perú</b> sin miedo a quedarte sin dinero.',
    lead: 'Tu pago queda retenido por Merkao y solo se libera al vendedor cuando confirmas que recibiste tu producto.',
    feats: [
      { icon: 'shield', tone: 'green', text: '100% de tu dinero protegido en cada compra' },
      { icon: 'truck', tone: 'brand', text: 'Envíos a las 24 regiones del país' },
      { icon: 'zap', tone: 'brand', text: 'Yape, Plin, Visa, Mastercard y transferencia' },
      { icon: 'checkCircle', tone: 'green', text: 'Devolución del 100% si tu pedido no llega' },
    ],
  },
  vendedor: {
    tag: '0% de comisión por 12 meses',
    title: 'Convierte lo que haces en un <b>negocio nacional</b>.',
    lead: 'Abre tu tienda gratis, vende a todo el Perú y recibe el 100% de tus ventas durante los primeros 12 meses.',
    feats: [
      { icon: 'store', tone: 'brand', text: '0% de comisión — te quedas con todo' },
      { icon: 'shield', tone: 'green', text: 'Cobras seguro con Pago Escrow' },
      { icon: 'bars', tone: 'brand', text: 'Panel con estadísticas y pedidos' },
      { icon: 'truck', tone: 'brand', text: 'Vende a las 24 regiones del Perú' },
    ],
  },
}

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()

  const [rol, setRol] = useState<Rol>('comprador')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Acepta ?role=vendedor (nuevo) y ?tipo=vendedor (legacy)
  useEffect(() => {
    const v = params.get('role') ?? params.get('tipo')
    if (v === 'vendedor') setRol('vendedor')
    else if (v === 'comprador') setRol('comprador')
  }, [params])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    const tel = telefono.replace(/\D/g, '')
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre.trim(),
          telefono: tel ? `+51${tel}` : null,
          tipo: rol,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(rol === 'vendedor' ? '/vendedor' : '/')
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  const brand = FEATS[rol]

  return (
    <div className="mk-auth">
      {/* ── Brand column (responde al rol) ── */}
      <aside className="mk-auth-brand">
        <div className="mk-auth-brand-bg" aria-hidden />

        <a href="/" className="mk-auth-logo">
          merkao<span>.pe</span>
        </a>

        <div className="mk-auth-brand-mid">
          <span
            className="mk-eyebrow"
            style={{ background: 'rgba(255,255,255,.08)', color: '#fff', marginBottom: 18, display: 'inline-flex' }}
          >
            <Icon name={rol === 'vendedor' ? 'store' : 'shield'} size={13} stroke={2} /> {brand.tag}
          </span>
          <h1 dangerouslySetInnerHTML={{ __html: brand.title }} />
          <p>{brand.lead}</p>

          <div className="mk-auth-feats">
            {brand.feats.map((f) => (
              <div key={f.text} className="mk-auth-feat">
                <Icon name={f.icon} size={20} stroke={2} className={f.tone === 'green' ? 'af-green' : ''} />
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mk-auth-brand-foot">
          <Icon name="lock" size={14} /> Conexión cifrada · Hecho en Perú 🇵🇪
        </div>
      </aside>

      {/* ── Form column ── */}
      <main className="mk-auth-form-wrap">
        <div className="mk-auth-card">
          <a href="/" className="mk-auth-back">
            <Icon name="chevronLeft" size={14} /> Volver al marketplace
          </a>

          <h2 className="mk-auth-h">Crea tu cuenta gratis</h2>
          <p className="mk-auth-sub">Elige cómo quieres usar Merkao y empieza en menos de 5 minutos.</p>

          {/* Role switch */}
          <div className="mk-role-tabs" role="tablist" aria-label="Tipo de cuenta">
            <button
              type="button"
              role="tab"
              aria-selected={rol === 'comprador'}
              className={'mk-role-tab' + (rol === 'comprador' ? ' on' : '')}
              onClick={() => setRol('comprador')}
            >
              <Icon name="cart" size={16} stroke={2} /> Soy comprador
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rol === 'vendedor'}
              className={'mk-role-tab' + (rol === 'vendedor' ? ' on' : '')}
              onClick={() => setRol('vendedor')}
            >
              <Icon name="store" size={16} stroke={2} /> Quiero vender
            </button>
          </div>

          {/* Promo contextual */}
          {rol === 'vendedor' ? (
            <div className="mk-role-promo">
              <Icon name="check" size={16} stroke={2.4} />
              <div>
                <strong>0% comisión durante 12 meses</strong>
                Te quedas con el 100% de tus ventas. Merkao cobra 3% al comprador, no a ti.
              </div>
            </div>
          ) : (
            <div className="mk-role-promo brand">
              <Icon name="shield" size={16} stroke={2.2} />
              <div>
                <strong>Tu pago, siempre protegido</strong>
                Retenemos el dinero hasta que confirmes que recibiste tu producto.
              </div>
            </div>
          )}

          {error && (
            <div className="mk-auth-error">
              <Icon name="lock" size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <label className="mk-field">
              <span>Nombre completo</span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                required
                autoComplete="name"
                minLength={2}
              />
            </label>

            <label className="mk-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </label>

            <label className="mk-field">
              <span>Teléfono / WhatsApp</span>
              <div className="mk-field-tel">
                <span className="mk-field-tel-prefix">🇵🇪 +51</span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="987 654 321"
                  autoComplete="tel-national"
                  inputMode="numeric"
                />
              </div>
            </label>

            <label className="mk-field">
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <small className="mk-field-hint">Usa al menos 8 caracteres. Mezcla letras y números.</small>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mk-btn mk-btn-primary mk-auth-submit"
              style={loading ? { opacity: 0.7, cursor: 'wait' } : undefined}
            >
              {loading
                ? 'Creando cuenta…'
                : rol === 'vendedor'
                  ? 'Crear cuenta de vendedor'
                  : 'Crear cuenta gratis'}
              {!loading && <Icon name="arrowRight" size={16} />}
            </button>
          </form>

          <div className="mk-auth-or">o continúa con</div>

          <div className="mk-auth-socials">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="mk-auth-social"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? 'Redirigiendo a Google…' : 'Continuar con Google'}
            </button>
          </div>

          <p className="mk-auth-foot-note">
            Al registrarte aceptas nuestros{' '}
            <a href="/terminos">Términos y condiciones</a>.
            <br />
            ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Cargando…</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
