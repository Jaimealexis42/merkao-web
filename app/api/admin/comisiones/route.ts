import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Endpoint admin: snapshot completo del ledger de comisiones Merkao.
// Auth: bearer + email allowlist. La tabla tiene RLS sin policies para
// anon — solo el service_role la lee. La validación de email viene del
// JWT del usuario (server-side, no se confía en el cliente).

const ADMIN_EMAILS = new Set(['alexisaranap21@gmail.com'])

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

type ComisionRow = {
  id: string
  pedido_id: string
  monto_total: number
  monto_merkao: number
  monto_vendedor: number
  estado: 'pendiente' | 'liberado'
  created_at: string
  pagado_a_vendedor: boolean | null
  pagado_at: string | null
  pedidos: { vendedor_id: string | null; nombre_comprador: string | null } | null
}

type ComisionOut = {
  id: string
  pedido_id: string
  vendedor_id: string | null
  vendedor_nombre: string
  nombre_comprador: string
  monto_total: number
  monto_merkao: number
  monto_vendedor: number
  estado: 'pendiente' | 'liberado'
  created_at: string
  pagado_a_vendedor: boolean
  pagado_at: string | null
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
  const userEmail = (userData.user.email ?? '').toLowerCase()
  if (!ADMIN_EMAILS.has(userEmail)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  // Una consulta con join a pedidos (FK pedido_id → pedidos.id).
  const { data: comisiones, error: eC } = await admin
    .from('comisiones_merkao')
    .select(
      'id, pedido_id, monto_total, monto_merkao, monto_vendedor, estado, created_at, pagado_a_vendedor, pagado_at, pedidos(vendedor_id, nombre_comprador)',
    )
    .order('created_at', { ascending: false })

  if (eC) {
    console.error('[admin/comisiones] select falló:', eC.message)
    return NextResponse.json({ error: 'Error leyendo el ledger.' }, { status: 500 })
  }

  const rows = (comisiones as unknown as ComisionRow[]) ?? []
  const vendedorIds = Array.from(
    new Set(rows.map((r) => r.pedidos?.vendedor_id).filter((v): v is string => !!v)),
  )

  // Nombres de tienda (no se rompe si vendedor sin tienda registrada).
  const tiendasMap = new Map<string, string>()
  if (vendedorIds.length > 0) {
    const { data: tiendas } = await admin
      .from('tiendas')
      .select('id, nombre')
      .in('id', vendedorIds)
    ;(tiendas as { id: string; nombre: string | null }[] | null)?.forEach((t) =>
      tiendasMap.set(t.id, t.nombre ?? 'Vendedor sin tienda'),
    )
  }

  const items: ComisionOut[] = rows.map((r) => ({
    id: r.id,
    pedido_id: r.pedido_id,
    vendedor_id: r.pedidos?.vendedor_id ?? null,
    vendedor_nombre: r.pedidos?.vendedor_id
      ? (tiendasMap.get(r.pedidos.vendedor_id) ?? 'Vendedor sin tienda')
      : 'Vendedor desconocido',
    nombre_comprador: r.pedidos?.nombre_comprador ?? '—',
    monto_total: Number(r.monto_total),
    monto_merkao: Number(r.monto_merkao),
    monto_vendedor: Number(r.monto_vendedor),
    estado: r.estado,
    created_at: r.created_at,
    pagado_a_vendedor: !!r.pagado_a_vendedor,
    pagado_at: r.pagado_at,
  }))

  // Agregados.
  let totalMerkaoPendiente = 0
  let totalMerkaoLiberado = 0
  let totalVendedorPagado = 0
  let totalVendedorPendientePagar = 0
  const porVendedor = new Map<
    string,
    {
      vendedor_id: string
      vendedor_nombre: string
      pendiente: number       // pedido todavía no liberado
      por_pagar: number       // liberado pero no transferido al vendedor
      pagado: number          // ya transferido off-platform
    }
  >()

  for (const it of items) {
    if (it.estado === 'pendiente') totalMerkaoPendiente += it.monto_merkao
    else totalMerkaoLiberado += it.monto_merkao

    // Vendedor: pagado vs por_pagar solo aplica a liberadas.
    if (it.estado === 'liberado') {
      if (it.pagado_a_vendedor) totalVendedorPagado += it.monto_vendedor
      else totalVendedorPendientePagar += it.monto_vendedor
    }

    const key = it.vendedor_id ?? '__sin_vendedor__'
    const existing = porVendedor.get(key) ?? {
      vendedor_id: it.vendedor_id ?? '',
      vendedor_nombre: it.vendedor_nombre,
      pendiente: 0,
      por_pagar: 0,
      pagado: 0,
    }
    if (it.estado === 'pendiente') {
      existing.pendiente += it.monto_vendedor
    } else if (it.pagado_a_vendedor) {
      existing.pagado += it.monto_vendedor
    } else {
      existing.por_pagar += it.monto_vendedor
    }
    porVendedor.set(key, existing)
  }

  return NextResponse.json({
    items,
    totales: {
      merkao_pendiente: +totalMerkaoPendiente.toFixed(2),
      merkao_liberado: +totalMerkaoLiberado.toFixed(2),
      vendedor_pagado: +totalVendedorPagado.toFixed(2),
      vendedor_pendiente_pagar: +totalVendedorPendientePagar.toFixed(2),
    },
    por_vendedor: Array.from(porVendedor.values())
      .map((v) => ({
        ...v,
        pendiente: +v.pendiente.toFixed(2),
        por_pagar: +v.por_pagar.toFixed(2),
        pagado: +v.pagado.toFixed(2),
      }))
      .sort((a, b) => b.por_pagar - a.por_pagar),
  })
}
