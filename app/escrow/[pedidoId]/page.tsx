import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'

export const metadata: Metadata = {
  title: 'Merkao — Confirmación de entrega',
  robots: 'noindex',
}

// Resultado que envía /api/escrow/confirmar vía query param ?r=
type Resultado =
  | 'confirmado'
  | 'problema_reportado'
  | 'ya_confirmado'
  | 'ya_reportado'
  | 'link_invalido'
  | 'no_encontrado'
  | 'cancelado'
  | 'error'
  | string

type Config = {
  icon: string
  titulo: string
  subtitulo: string
  color: string
}

function config(r: Resultado): Config {
  switch (r) {
    case 'confirmado':
      return {
        icon: '✓',
        titulo: '¡Recepción confirmada!',
        subtitulo: 'Liberamos el pago al vendedor. Gracias por comprar con Merkao.',
        color: '#16a34a',
      }
    case 'problema_reportado':
      return {
        icon: '!',
        titulo: 'Problema reportado',
        subtitulo: 'Frenamos el pago. Nuestro equipo se pondrá en contacto contigo para resolver.',
        color: '#dc2626',
      }
    case 'ya_confirmado':
      return {
        icon: '✓',
        titulo: 'Entrega ya confirmada',
        subtitulo: 'Este pedido ya fue confirmado anteriormente. El pago fue liberado al vendedor.',
        color: '#16a34a',
      }
    case 'ya_reportado':
      return {
        icon: '!',
        titulo: 'Problema ya registrado',
        subtitulo: 'Ya tenemos tu reporte. El pago está frenado y estamos revisando el caso.',
        color: '#dc2626',
      }
    case 'cancelado':
      return {
        icon: 'x',
        titulo: 'Pedido cancelado',
        subtitulo: 'Este pedido fue cancelado y el pago fue reembolsado.',
        color: '#6b7280',
      }
    case 'link_invalido':
    case 'no_encontrado':
      return {
        icon: '?',
        titulo: 'Enlace inválido',
        subtitulo: 'Este enlace no es válido o ya expiró. Si tienes un problema, escríbenos a merkao.org@gmail.com.',
        color: '#f59e0b',
      }
    default:
      return {
        icon: '!',
        titulo: 'Algo salió mal',
        subtitulo: 'No pudimos procesar tu confirmación. Por favor escríbenos a merkao.org@gmail.com con el número de pedido.',
        color: '#f59e0b',
      }
  }
}

export default async function EscrowResultadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ pedidoId: string }>
  searchParams: Promise<{ r?: string }>
}) {
  const { pedidoId } = await params
  const { r } = await searchParams
  const resultado = (r ?? 'error') as Resultado
  const cfg = config(resultado)

  return (
    <>
      <SiteTopnav />
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: cfg.color,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 32, color: '#fff', fontWeight: 800 }}>{cfg.icon}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: '0 0 12px' }}>
            {cfg.titulo}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 8px' }}>
            {cfg.subtitulo}
          </p>
          {pedidoId && pedidoId !== 'invalido' && (
            <p style={{ fontSize: 12, color: 'var(--muted-2)', fontFamily: 'monospace', marginBottom: 32 }}>
              Pedido: {pedidoId}
            </p>
          )}
          <Link href="/" className="mk-btn mk-btn-ghost" style={{ display: 'inline-block' }}>
            Ir al inicio
          </Link>
        </div>
      </main>
      <SiteFootnav />
    </>
  )
}
