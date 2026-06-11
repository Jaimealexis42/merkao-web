import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ── Confirmar entrega = liberar escrow.
// El comprador autentica con su JWT (bearer). Validamos ownership del
// pedido server-side, luego actualizamos `pedidos` + `comisiones_merkao`
// con admin client (RLS bypass). El ledger de comisiones tiene RLS sin
// policies para anon, así que la única vía válida pasa por aquí.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let _admin: SupabaseClient | null = null
function getAdminClient(): SupabaseClient | null {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return _admin
}

function buildAuthedClient(token: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function POST(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Servicio no disponible. Contacta soporte.' },
      { status: 500 },
    )
  }

  const ip = getClientIp(req)
  const rl = checkRateLimit(`liberar:${ip}`)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera un minuto.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
        },
      },
    )
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Sin autenticación.' }, { status: 401 })
  }
  const authClient = buildAuthedClient(token)
  if (!authClient) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })
  }
  const { data: userData, error: eUser } = await authClient.auth.getUser()
  if (eUser || !userData.user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 })
  }
  const userId = userData.user.id
  const userEmail = (userData.user.email ?? '').toLowerCase()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  const pedidoId = body.pedido_id
  if (typeof pedidoId !== 'string' || !UUID_RE.test(pedidoId)) {
    return NextResponse.json({ error: 'pedido_id inválido.' }, { status: 400 })
  }

  // Ownership: comprador_id O email_comprador (guest-checkout convertido).
  const { data: pedido, error: eP } = await admin
    .from('pedidos')
    .select('id, comprador_id, email_comprador, estado')
    .eq('id', pedidoId)
    .single()
  if (eP || !pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
  }
  const emailPedido =
    typeof pedido.email_comprador === 'string' ? pedido.email_comprador.toLowerCase() : ''
  const isOwner = pedido.comprador_id === userId || (emailPedido !== '' && emailPedido === userEmail)
  if (!isOwner) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  // Idempotente: si ya está liberado, no es error.
  if (pedido.estado === 'liberado') {
    return NextResponse.json({ success: true, already: true })
  }

  const { error: ePU } = await admin
    .from('pedidos')
    .update({ estado: 'liberado', escrow_liberado: true })
    .eq('id', pedidoId)
  if (ePU) {
    console.error('[confirmar-entrega] update pedidos falló:', ePU.message)
    return NextResponse.json({ error: 'No se pudo liberar el pago.' }, { status: 500 })
  }

  // Comisión: marcar liberada solo si seguía pendiente (evita pisar reembolsos).
  // Si esto falla NO revertimos pedido — el comprador ya confirmó. Log para reconciliación.
  const { error: eCU } = await admin
    .from('comisiones_merkao')
    .update({ estado: 'liberado' })
    .eq('pedido_id', pedidoId)
    .eq('estado', 'pendiente')
  if (eCU) {
    console.error(
      '[confirmar-entrega] pedido liberado pero comisiones falló:',
      eCU.message,
      'pedido_id:', pedidoId,
    )
  }

  return NextResponse.json({ success: true })
}
