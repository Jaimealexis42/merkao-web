// Header y footer compartidos para las páginas estáticas Fase 4
// (/vende, /como-funciona-escrow, /mis-pedidos)

import Link from 'next/link'
import { Icon } from '@/lib/icons'

type Active = 'inicio' | 'mis-pedidos' | 'escrow' | 'vende' | null

export function SiteTopnav({ active = null, showTrust = false }: { active?: Active; showTrust?: boolean }) {
  return (
    <header className="mk-tnav">
      <div className="mk-tnav-inner">
        <Link className="mk-logo" href="/">
          merkao<span className="mk-logo-dot">.pe</span>
        </Link>
        <nav className="mk-tnav-links">
          <Link className={'mk-tnav-link' + (active === 'inicio' ? ' on' : '')} href="/">Inicio</Link>
          <Link className={'mk-tnav-link' + (active === 'mis-pedidos' ? ' on' : '')} href="/mis-pedidos">Mis pedidos</Link>
          <Link className={'mk-tnav-link' + (active === 'escrow' ? ' on' : '')} href="/como-funciona-escrow">Pago Escrow</Link>
          <Link className={'mk-tnav-link' + (active === 'vende' ? ' on' : '')} href="/vende">Vender</Link>
        </nav>
        <div className="mk-tnav-right">
          {showTrust ? (
            <span className="mk-trust-chip">
              <Icon name="shield" size={14} stroke={2} /> Compra protegida
            </span>
          ) : (
            <>
              <Link className="mk-btn mk-btn-ghost" href="/login">Ingresar</Link>
              <Link className="mk-btn mk-btn-primary" href="/register?role=vendedor">Abrir mi tienda</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function SiteFootnav() {
  return (
    <footer className="mk-foot">
      <div className="mk-foot-inner">
        <Link className="mk-logo" href="/">
          merkao<span className="mk-logo-dot">.pe</span>
        </Link>
        <nav className="mk-foot-links">
          <Link href="/">Inicio</Link>
          <Link href="/mis-pedidos">Mis pedidos</Link>
          <Link href="/como-funciona-escrow">Pago Escrow</Link>
          <Link href="/vende">Vender</Link>
          <Link href="/vendedor">Panel de Vendedor</Link>
          <Link href="/contacto">Contacto</Link>
          <Link href="/libro-de-reclamaciones">Libro de Reclamaciones</Link>
        </nav>
        <div className="mk-foot-copy">© 2026 Merkao · Hecho en Perú 🇵🇪 · Compra protegida con Pago Escrow</div>
      </div>
    </footer>
  )
}
