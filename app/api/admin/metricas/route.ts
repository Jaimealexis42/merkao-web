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

  // Round 1: queries independientes en paralelo.
  // auth.users no está en PostgREST → RPC count_auth_users (SECURITY DEFINER).
  // tiendas se trae con IDs para filtrar productos en round 2.
  const [usuariosRes, visitasRes, tiendaIdsRes, pedidosTotRes, pedidosCompRes] = await Promise.all([
    admin.rpc('count_auth_users'),
    admin.from('page_views').select('*', { count: 'exact', head: true }),
    admin.from('tiendas').select('id'),
    admin.from('pedidos').select('*', { count: 'exact', head: true }),
    admin.from('pedidos').select('total').in('estado', ['entregado', 'liberado']),
  ])

  if (usuariosRes.error) {
    console.error('[admin/metricas] count_auth_users:', usuariosRes.error.message)
    return NextResponse.json({ error: 'Error contando usuarios.' }, { status: 500 })
  }
  if (visitasRes.error) {
    console.error('[admin/metricas] count(page_views):', visitasRes.error.message)
    return NextResponse.json({ error: 'Error contando visitas.' }, { status: 500 })
  }
  if (tiendaIdsRes.error) {
    console.error('[admin/metricas] tiendas ids:', tiendaIdsRes.error.message)
    return NextResponse.json({ error: 'Error cargando vendedores.' }, { status: 500 })
  }

  const tiendaIds = (tiendaIdsRes.data ?? []).map((t: { id: string }) => t.id)

  // Round 2: productos de vendedores reales (requiere tiendaIds del round 1).
  const productosRes = tiendaIds.length > 0
    ? await admin.from('productos').select('id, imagenes').in('vendedor_id', tiendaIds)
    : { data: [], error: null }

  if (productosRes.error) {
    console.error('[admin/metricas] productos:', productosRes.error.message)
    return NextResponse.json({ error: 'Error contando productos.' }, { status: 500 })
  }

  const productos       = productosRes.data ?? []
  const productosCon    = productos.filter((p: { imagenes: string[] | null }) => p.imagenes && p.imagenes.length > 0).length
  const ventasTotales   = (pedidosCompRes.data ?? []).reduce((s: number, p: { total: unknown }) => s + (Number(p.total) || 0), 0)

  return NextResponse.json({
    usuarios:          Number(usuariosRes.data ?? 0),
    vendedores:        tiendaIds.length,
    visitas:           visitasRes.count ?? 0,
    productos_total:   productos.length,
    productos_con:     productosCon,
    productos_sin:     productos.length - productosCon,
    pedidos_total:     pedidosTotRes.count ?? 0,
    ventas_totales:    ventasTotales,
  })
}
