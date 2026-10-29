import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { verificarToken, type EscrowAction } from '@/lib/escrow-token'
import { sendEmail } from '@/lib/email'
import { escrowProblemaAdminHtml } from '@/lib/email-escrow'

// Endpoint público (sin sesión). Valida HMAC, aplica acción, redirige a la
// página de resultado. El link llega por email al comprador.
//
// GET /api/escrow/confirmar?p=<pedidoId>&a=ok|problema&t=<hmac>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://merkao.org').replace(/\/$/, '')

let _admin: SupabaseClient | null = null
function getAdmin(): SupabaseClient | null {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return _admin
}

function redirect(pedidoId: string, resultado: string): NextResponse {
  return NextResponse.redirect(`${BASE}/escrow/${pedidoId}?r=${resultado}`, { status: 302 })
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const pedidoId = sp.get('p') ?? ''
  const action   = (sp.get('a') ?? '') as EscrowAction
  const token    = sp.get('t') ?? ''

  // Validar parámetros básicos
  if (!UUID_RE.test(pedidoId)) return redirect('invalido', 'link_invalido')
  if (action !== 'ok' && action !== 'problema') return redirect(pedidoId, 'link_invalido')

  // Validar HMAC (timing-safe)
  if (!verificarToken(pedidoId, action, token)) {
    return redirect(pedidoId, 'link_invalido')
  }

  const admin = getAdmin()
  if (!admin) return redirect(pedidoId, 'error')

  // Leer pedido
  const { data: pedido, error: eP } = await admin
    .from('pedidos')
    .select('id, estado, email_comprador, nombre_comprador, total')
    .eq('id', pedidoId)
    .single()

  if (eP || !pedido) return redirect(pedidoId, 'no_encontrado')

  // Estados finales — idempotente
  if (pedido.estado === 'liberado') return redirect(pedidoId, 'ya_confirmado')
  if (pedido.estado === 'disputado') return redirect(pedidoId, 'ya_reportado')
  if (pedido.estado === 'cancelado') return redirect(pedidoId, 'cancelado')

  if (action === 'ok') {
    // Confirmar recepción → liberar escrow
    const { error: eU } = await admin
      .from('pedidos')
      .update({ estado: 'liberado', escrow_liberado: true })
      .eq('id', pedidoId)
    if (eU) {
      console.error('[escrow/confirmar] update liberado falló:', eU.message, pedidoId)
      return redirect(pedidoId, 'error')
    }

    // Marcar comisión liberada (soft fail)
    void admin
      .from('comisiones_merkao')
      .update({ estado: 'liberado' })
      .eq('pedido_id', pedidoId)
      .eq('estado', 'pendiente')
      .then(({ error: eC }) => {
        if (eC) console.error('[escrow/confirmar] comisiones falló (pedido ok):', eC.message, pedidoId)
      })

    return redirect(pedidoId, 'confirmado')
  }

  // action === 'problema' → frenar pago, avisar admin
  const { error: eD } = await admin
    .from('pedidos')
    .update({ estado: 'disputado' })
    .eq('id', pedidoId)
    .not('estado', 'in', '("liberado","cancelado")')
  if (eD) {
    console.error('[escrow/confirmar] update disputado falló:', eD.message, pedidoId)
    return redirect(pedidoId, 'error')
  }

  // Leer snapshot para el email (best-effort)
  const { data: item } = await admin
    .from('pedido_items')
    .select('nombre_producto')
    .eq('pedido_id', pedidoId)
    .limit(1)
    .maybeSingle()

  const adminEmail = process.env.GMAIL_USER ?? ''
  if (adminEmail) {
    const total = `S/ ${Number(pedido.total ?? 0).toFixed(2)}`
    void sendEmail({
      to: adminEmail,
      subject: `⚠️ Problema en pedido ${pedidoId.slice(0, 8)}`,
      html: escrowProblemaAdminHtml({
        pedidoId,
        emailComprador:  pedido.email_comprador ?? '',
        nombreComprador: pedido.nombre_comprador ?? '',
        nombreProducto:  item?.nombre_producto ?? '(sin nombre)',
        total,
      }),
      text: `Problema reportado en pedido ${pedidoId}\nComprador: ${pedido.email_comprador}\nTotal: ${total}`,
    }).then(r => {
      if (!r.ok) console.error('[escrow/confirmar] email admin falló:', r)
    })
  }

  return redirect(pedidoId, 'problema_reportado')
}
