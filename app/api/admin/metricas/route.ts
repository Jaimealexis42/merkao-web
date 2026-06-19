import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'

// ── Endpoint admin: conteos totales para el panel de métricas.
// Auth: bearer + email allowlist (lib/admin). Mismo patrón que
// /api/admin/comisiones.

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

export async function GET(req: NextRequest) {
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

  // `count: 'exact'` + `head: true` devuelve el count sin transferir filas.
  // `auth.users` no está expuesto vía PostgREST → va por RPC al wrapper
  // `count_auth_users()` (SECURITY DEFINER, EXECUTE solo para service_role).
  const [usuariosRes, vendedoresRes, visitasRes] = await Promise.all([
    admin.rpc('count_auth_users'),
    admin.from('tiendas').select('*', { count: 'exact', head: true }),
    admin.from('page_views').select('*', { count: 'exact', head: true }),
  ])

  if (usuariosRes.error) {
    console.error('[admin/metricas] count_auth_users falló:', usuariosRes.error.message)
    return NextResponse.json({ error: 'Error contando usuarios.' }, { status: 500 })
  }
  if (vendedoresRes.error) {
    console.error('[admin/metricas] count(tiendas) falló:', vendedoresRes.error.message)
    return NextResponse.json({ error: 'Error contando vendedores.' }, { status: 500 })
  }
  if (visitasRes.error) {
    console.error('[admin/metricas] count(page_views) falló:', visitasRes.error.message)
    return NextResponse.json({ error: 'Error contando visitas.' }, { status: 500 })
  }

  return NextResponse.json({
    usuarios: Number(usuariosRes.data ?? 0),
    vendedores: vendedoresRes.count ?? 0,
    visitas: visitasRes.count ?? 0,
  })
}
