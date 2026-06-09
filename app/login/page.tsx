'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Icon } from '@/lib/icons'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    // redirectTo dinámico para que funcione en producción (merkao.org) y dev
    // (localhost:3000). Ambas URLs deben estar whitelisted en Supabase
    // Dashboard → Authentication → URL Configuration → Redirect URLs.
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
    // Si OK, el browser se redirige a Google.
  }

  return (
    <div className="mk-auth">

      {/* ── Brand column ── */}
      <aside className="mk-auth-brand">
        <div className="mk-auth-brand-bg" aria-hidden />

        <a href="/" className="mk-auth-logo">
          merkao<span>.pe</span>
        </a>

        <div className="mk-auth-brand-mid">
          <h1>Compra y vende en todo el <b>Perú</b>, con tu dinero protegido.</h1>
          <p>
            El marketplace peruano con pago Escrow: tu dinero queda retenido hasta que confirmes que recibiste tu producto.
          </p>

          <div className="mk-auth-feats">
            <div className="mk-auth-feat">
              <Icon name="shield" size={20} stroke={2} className="af-green" />
              <span>Pago protegido en cada compra</span>
            </div>
            <div className="mk-auth-feat">
              <Icon name="store" size={20} stroke={2} />
              <span>0% comisión para vendedores</span>
            </div>
            <div className="mk-auth-feat">
              <Icon name="truck" size={20} stroke={2} />
              <span>Envíos a todo el país</span>
            </div>
            <div className="mk-auth-feat">
              <Icon name="zap" size={20} stroke={2} />
              <span>Yape, Plin, Visa, Mastercard y transferencia</span>
            </div>
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

          <h2 className="mk-auth-h">Bienvenido de vuelta</h2>
          <p className="mk-auth-sub">Ingresa a tu cuenta para seguir comprando o vendiendo.</p>

          {error && (
            <div className="mk-auth-error">
              <Icon name="lock" size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
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
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </label>

            <div className="mk-field-row">
              <span style={{ color: 'var(--muted)' }}>¿Primera vez en Merkao?</span>
              <a href="/forgot-password">¿Olvidaste tu contraseña?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mk-btn mk-btn-primary mk-auth-submit"
              style={loading ? { opacity: 0.7, cursor: 'wait' } : undefined}
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
              {!loading && <Icon name="arrowRight" size={16} />}
            </button>
          </form>

          <div className="mk-auth-or">o continúa con</div>

          <div className="mk-auth-socials">
            <button
              type="button"
              onClick={handleGoogleLogin}
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
            ¿No tienes cuenta? <a href="/register">Regístrate gratis</a>
            <br />
            ¿Quieres vender en Merkao? <a href="/register?tipo=vendedor">Crea tu tienda</a>
          </p>

        </div>
      </main>
    </div>
  )
}
