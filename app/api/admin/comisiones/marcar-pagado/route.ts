import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'

// POST /api/admin/comisiones/marcar-pagado
// Marca una comision liberada como pagada al vendedor (transfer off-platform OK).
// Auth: bearer + email allowlist (lib/admin). Mismo modelo que GET /api/admin/comisiones.

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
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })
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
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  }
  if (!isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  const comisionId = body.comision_id
  if (typeof comisionId !== 'string' || !UUID_RE.test(comisionId)) {
    return NextResponse.json({ error: 'comision_id inválido.' }, { status: 400 })
  }

  // Validar estado actual: debe estar liberada y no pagada todavía.
  // Si ya está pagada → idempotente (200 con flag).
  const { data: comision, error: eC } = await admin
    .from('comisiones_merkao')
    .select('id, estado, pagado_a_vendedor, pagado_at')
    .eq('id', comisionId)
    .single()
  if (eC || !comision) {
    return NextResponse.json({ error: 'Comisión no encontrada.' }, { status: 404 })
  }
  if (comision.estado !== 'liberado') {
    return NextResponse.json(
      { error: 'Solo se pueden marcar pagadas las comisiones liberadas.' },
      { status: 409 },
    )
  }
  if (comision.pagado_a_vendedor) {
    return NextResponse.json({
      success: true,
      already: true,
      pagado_at: comision.pagado_at,
    })
  }

  const nowIso = new Date().toISOString()
  const { error: eU } = await admin
    .from('comisiones_merkao')
    .update({ pagado_a_vendedor: true, pagado_at: nowIso })
    .eq('id', comisionId)
    .eq('estado', 'liberado')          // guard race: si cambió, no escribe
    .eq('pagado_a_vendedor', false)
  if (eU) {
    console.error('[marcar-pagado] update falló:', eU.message)
    return NextResponse.json({ error: 'No se pudo marcar como pagado.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, pagado_at: nowIso })
}
