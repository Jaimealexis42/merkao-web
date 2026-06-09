'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/precios'
import { useAuth } from '@/lib/useAuth'
import { Icon, type IconName } from '@/lib/icons'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'

type EstadoPedido =
  | 'pagado' | 'enviado' | 'entregado' | 'liberado' | 'disputado' | 'cancelado'

type Pedido = {
  id: string
  total: number
  estado: EstadoPedido
  created_at: string
  direccion_entrega: string | null
  metodo_pago: string | null
}

const ESTADO_META: Record<EstadoPedido, { label: string; tone: 'amber' | 'navy' | 'green' | 'red'; icon: IconName }> = {
  pagado:    { label: 'Pago retenido', tone: 'amber', icon: 'lock' },
  enviado:   { label: 'En camino',     tone: 'navy',  icon: 'truck' },
  entregado: { label: 'Por confirmar', tone: 'amber', icon: 'home' },
  liberado:  { label: 'Completado',    tone: 'green', icon: 'checkCircle' },
  disputado: { label: 'En disputa',    tone: 'red',   icon: 'bell' },
  cancelado: { label: 'Cancelado',     tone: 'red',   icon: 'trash' },
}

const METODOS: { id: string; label: string; hint: string; icon: IconName }[] = [
  { id: 'yape', label: 'Yape', hint: 'Billetera móvil', icon: 'zap' },
  { id: 'plin', label: 'Plin', hint: 'Billetera móvil', icon: 'zap' },
  { id: 'tarjeta', label: 'Visa / Mastercard', hint: 'Tokenizado por Culqi', icon: 'card' },
  { id: 'transferencia', label: 'Transferencia bancaria', hint: 'BCP · BBVA · Interbank', icon: 'wallet' },
]

function shortId(id: string) {
  return '#MK-' + id.slice(0, 8).toUpperCase()
}

function fmtFecha(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('es-PE', opts)
}

export default function PerfilPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?redirect=/perfil')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const safeEmail = (user.email ?? '').replace(/[(),]/g, '')
    const orFilter = safeEmail
      ? `comprador_id.eq.${user.id},email_comprador.eq.${safeEmail}`
      : `comprador_id.eq.${user.id}`

    supabase
      .from('pedidos')
      .select('id, total, estado, created_at, direccion_entrega, metodo_pago')
      .or(orFilter)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPedidos((data ?? []) as Pedido[])
        setLoadingPedidos(false)
      })
  }, [user])

  const stats = useMemo(() => {
    const completados = pedidos.filter((p) => p.estado === 'liberado').length
    const gastado = pedidos
      .filter((p) => p.estado !== 'cancelado' && p.estado !== 'disputado')
      .reduce((s, p) => s + Number(p.total ?? 0), 0)
    return { total: pedidos.length, completados, gastado: +gastado.toFixed(2) }
  }, [pedidos])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Cargando…</p>
      </div>
    )
  }
  if (!user) return null

  const meta = user.user_metadata ?? {}
  const nombre =
    (meta.nombre as string | undefined) ??
    (meta.full_name as string | undefined) ??
    (user.email?.split('@')[0] ?? 'Usuario')
  const avatarUrl = meta.avatar_url as string | undefined
  const telefono = meta.telefono as string | undefined
  const tipo = ((meta.tipo as string | undefined) ?? 'comprador').toLowerCase()
  const iniciales = nombre
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'
  const miembroDesde = fmtFecha(user.created_at, { month: 'long', year: 'numeric' })
  const ultimoAcceso = fmtFecha(user.last_sign_in_at ?? user.created_at, {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const ultimos = pedidos.slice(0, 5)

  return (
    <>
      <SiteTopnav active={null} showTrust />

      <main className="mk-prof">
        <nav className="mk-crumb-row" aria-label="Migas">
          <Link href="/">Inicio</Link>
          <Icon name="chevronRight" size={12} stroke={2} />
          <span className="on">Mi perfil</span>
        </nav>

        {/* ── Hero / identidad ── */}
        <section className="mk-prof-hero">
          <div className="mk-prof-avatar" aria-hidden>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={nombre} />
            ) : (
              <span>{iniciales}</span>
            )}
          </div>

          <div className="mk-prof-id">
            <h1>{nombre}</h1>
            <div className="mk-prof-email">{user.email}</div>
            <div className="mk-prof-since">Miembro desde {miembroDesde}</div>

            <div className="mk-prof-chips">
              {tipo === 'vendedor' ? (
                <Link href="/vendedor" className="mk-btn mk-btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
                  <Icon name="store" size={15} stroke={2} /> Panel de vendedor
                </Link>
              ) : (
                <Link href="/vende" className="mk-btn mk-btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
                  <Icon name="store" size={15} stroke={2} /> Abrir mi tienda
                </Link>
              )}
              <Link href="/mis-pedidos" className="mk-btn mk-btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
                <Icon name="box" size={15} stroke={2} /> Mis pedidos
              </Link>
            </div>
          </div>

          <div className="mk-prof-stats">
            <div className="mk-prof-stat brand">
              <div className="v">{stats.total}</div>
              <div className="l">Pedidos</div>
            </div>
            <div className="mk-prof-stat green">
              <div className="v">{stats.completados}</div>
              <div className="l">Completados</div>
            </div>
            <div className="mk-prof-stat">
              <div className="v">{fmt(stats.gastado).replace('S/ ', 'S/')}</div>
              <div className="l">Gastado</div>
            </div>
          </div>
        </section>

        {/* ── Grid 2 col: Datos + Pago ── */}
        <div className="mk-prof-grid">
          {/* Datos personales */}
          <section className="mk-prof-card">
            <div className="mk-prof-card-h">
              <h2><Icon name="user" size={16} stroke={2} /> Datos personales</h2>
            </div>
            <div className="mk-prof-rows">
              <div className="mk-prof-row">
                <span>Nombre</span>
                <span>{nombre}</span>
              </div>
              <div className="mk-prof-row">
                <span>Correo electrónico</span>
                <span>{user.email}</span>
              </div>
              <div className="mk-prof-row">
                <span>Teléfono</span>
                <span>{telefono ? telefono : <small style={{ color: 'var(--muted-2)', fontWeight: 600 }}>Sin registrar</small>}</span>
              </div>
              <div className="mk-prof-row">
                <span>Tipo de cuenta</span>
                <span style={{ textTransform: 'capitalize' }}>{tipo}</span>
              </div>
              <div className="mk-prof-row">
                <span>Verificación de email</span>
                <span className={user.email_confirmed_at ? 'green' : 'amber'}>
                  {user.email_confirmed_at ? '✓ Verificado' : '⚠ Pendiente'}
                </span>
              </div>
              <div className="mk-prof-row">
                <span>Último acceso</span>
                <span>{ultimoAcceso}</span>
              </div>
              <div className="mk-prof-row">
                <span>ID de usuario</span>
                <span><code>{user.id.slice(0, 8)}…</code></span>
              </div>
            </div>
          </section>

          {/* Métodos de pago */}
          <section className="mk-prof-card">
            <div className="mk-prof-card-h">
              <h2><Icon name="card" size={16} stroke={2} /> Métodos de pago</h2>
              <span className="mk-prof-pay-chip">Próximamente</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Pronto podrás guardar tus tarjetas en una bóveda cifrada por Culqi. Hoy, todos los pagos en Merkao pasan por Pago Escrow protegido.
            </p>
            {METODOS.map((m) => (
              <div key={m.id} className="mk-prof-pay-row">
                <span className="mk-prof-pay-ico">
                  <Icon name={m.icon} size={18} stroke={1.9} />
                </span>
                <div className="mk-prof-pay-info">
                  <strong>{m.label}</strong>
                  <small>{m.hint}</small>
                </div>
                <span className="mk-prof-pay-chip" style={{ background: 'var(--green-tint)', color: 'var(--green)' }}>
                  Aceptado
                </span>
              </div>
            ))}
          </section>
        </div>

        {/* ── Historial reciente ── */}
        <section className="mk-prof-card">
          <div className="mk-prof-card-h">
            <h2><Icon name="box" size={16} stroke={2} /> Pedidos recientes</h2>
            <Link href="/mis-pedidos">Ver todos <Icon name="arrowRight" size={12} stroke={2} /></Link>
          </div>

          {loadingPedidos ? (
            <div className="mk-prof-empty">
              <p>Cargando historial…</p>
            </div>
          ) : ultimos.length === 0 ? (
            <div className="mk-prof-empty">
              <h3>Todavía no tienes pedidos</h3>
              <p>Cuando compres en Merkao aparecerá aquí tu historial.</p>
              <Link href="/" className="mk-btn mk-btn-primary" style={{ padding: '10px 18px', fontSize: 13 }}>
                Explorar marketplace <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          ) : (
            <div className="mk-prof-orders">
              {ultimos.map((p) => {
                const e = ESTADO_META[p.estado] ?? ESTADO_META.pagado
                return (
                  <Link key={p.id} href={`/pedidos/${p.id}`} className="mk-prof-order">
                    <span className="mk-prof-order-ico">
                      <Icon name={e.icon} size={18} stroke={1.9} />
                    </span>
                    <div className="mk-prof-order-info">
                      <strong>{shortId(p.id)}</strong>
                      <small>{fmtFecha(p.created_at)} · {p.direccion_entrega ? p.direccion_entrega.slice(0, 60) : 'Sin dirección'}</small>
                    </div>
                    <div className="mk-prof-order-right">
                      <span className="price">{fmt(p.total)}</span>
                      <span className={'mk-prof-badge ' + e.tone}>{e.label}</span>
                    </div>
                    <Icon name="chevronRight" size={14} stroke={2} style={{ color: 'var(--muted-2)', flexShrink: 0 }} />
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Sign out ── */}
        <section className="mk-prof-danger">
          <div>
            <strong>Cerrar sesión</strong>
            <small>Cerrarás tu cuenta en este navegador. Podrás volver a entrar cuando quieras.</small>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mk-btn mk-btn-danger"
            style={signingOut ? { opacity: 0.6, cursor: 'wait' } : undefined}
          >
            <Icon name="logout" size={15} stroke={2} />
            {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </section>
      </main>

      <SiteFootnav />
    </>
  )
}
