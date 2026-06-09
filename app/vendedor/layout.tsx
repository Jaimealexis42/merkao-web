'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { Icon, type IconName } from '@/lib/icons'

type NavItem = { href: string; label: string; icon: IconName }

const NAV: NavItem[] = [
  { href: '/vendedor',               label: 'Resumen',           icon: 'gauge' },
  { href: '/vendedor/publicar',      label: 'Publicar producto', icon: 'plus' },
  { href: '/vendedor/mis-productos', label: 'Mis productos',     icon: 'box' },
  { href: '/vendedor/pedidos',       label: 'Pedidos',           icon: 'truck' },
  { href: '/vendedor/mi-tienda',     label: 'Mi tienda',         icon: 'store' },
  { href: '/vendedor/datos-pago',    label: 'Datos de pago',     icon: 'wallet' },
]

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading || !user) {
    return (
      <div className="mk-empty-page" style={{ minHeight: '100vh' }}>
        <p style={{ color: 'var(--muted-2)' }}>Verificando sesión…</p>
      </div>
    )
  }

  const nombre = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Vendedor'
  const inicial = (nombre[0] ?? 'M').toUpperCase()
  const inicial2 = (nombre[1] ?? '').toUpperCase()

  return (
    <div className="mk-vlayout">

      {/* ── Top bar ── */}
      <header className="mk-vhdr">
        <div className="mk-vhdr-left">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="mk-vhdr-ico"
            aria-label="Menú"
            style={{ display: 'none' }}
            id="mk-vhdr-burger"
          >
            <Icon name="menu" size={20} />
          </button>
          <a href="/" className="mk-logo">merkao<span className="mk-logo-dot">.pe</span></a>
          <span className="mk-vhdr-tag">Panel de Vendedor</span>
        </div>

        <div className="mk-vhdr-search">
          <Icon name="search" size={17} />
          <input placeholder="Buscar producto, pedido o cliente…" />
        </div>

        <div className="mk-vhdr-right">
          <a href="/" className="mk-vhdr-store">
            <Icon name="store" size={16} stroke={1.8} /> Ver marketplace
          </a>
          <div className="mk-vhdr-user">
            <div className="mk-vhdr-avatar">{inicial}{inicial2}</div>
            <div className="mk-vhdr-user-txt">
              <strong>{nombre}</strong>
              <small>Vendedor</small>
            </div>
          </div>
        </div>
      </header>

      <div className="mk-vbody">

        {/* ── Sidebar ── */}
        <aside className={'mk-vside' + (sidebarOpen ? ' open' : '')}>
          <nav className="mk-vnav">
            {NAV.map((item) => {
              const isActive = pathname === item.href
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={'mk-vnav-item' + (isActive ? ' on' : '')}
                >
                  <Icon name={item.icon} size={19} stroke={1.8} />
                  <span className="mk-vnav-label">{item.label}</span>
                </a>
              )
            })}
          </nav>

          <div className="mk-vside-foot">
            <div className="mk-vstore-card">
              <div className="mk-vstore-head">
                <div className="mk-vhdr-avatar lg">{inicial}{inicial2}</div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</strong>
                  <span className="mk-vstore-rating">
                    <Icon name="checkCircle" size={12} className="mk-star on" /> Verificado
                  </span>
                </div>
              </div>
              <div className="mk-vstore-meter">
                <div className="mk-vstore-meter-head">
                  <span>Cuenta activa</span><span>100%</span>
                </div>
                <div className="mk-vstore-bar"><div className="mk-vstore-fill" style={{ width: '100%' }} /></div>
              </div>
            </div>

            <button onClick={handleSignOut} className="mk-vnav-item logout">
              <Icon name="logout" size={19} stroke={1.8} />
              <span className="mk-vnav-label">Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="mk-vmain">
          {children}
        </main>

      </div>
    </div>
  )
}
