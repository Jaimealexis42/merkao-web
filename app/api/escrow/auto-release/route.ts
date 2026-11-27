import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cron endpoint: Vercel lo llama una vez al día (ver vercel.json).
// Libera pedidos donde el vendedor marcó entrega hace >7 días y el comprador
// no confirmó ni reportó problema.
//
// Vercel Cron llama con GET y envía Authorization: Bearer ${CRON_SECRET}.
// Sin CRON_SECRET configurado el endpoint no hace nada (falla cerrado).

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

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[auto-release] falta CRON_SECRET: no se ejecuta')
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'DB no disponible' }, { status: 500 })
  }

  // Pedidos con estado='entregado' y entregado_at hace más de 7 días
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: listos, error: eQ } = await admin
    .from('pedidos')
    .select('id')
    .eq('estado', 'entregado')
    .eq('escrow_liberado', false)
    .lt('entregado_at', cutoff)

  if (eQ) {
    console.error('[auto-release] query falló:', eQ.message)
    return NextResponse.json({ error: eQ.message }, { status: 500 })
  }

  if (!listos || listos.length === 0) {
    return NextResponse.json({ liberados: 0, mensaje: 'Nada que liberar.' })
  }

  const ids = listos.map(p => p.id as string)

  // Liberar pedidos. El filtro por estado evita pisar una disputa abierta
  // entre la consulta y la actualización.
  const { data: actualizados, error: eU } = await admin
    .from('pedidos')
    .update({ estado: 'liberado', escrow_liberado: true })
    .in('id', ids)
    .eq('estado', 'entregado')
    .select('id')
  if (eU) {
    console.error('[auto-release] update liberado falló:', eU.message, 'ids:', ids)
    return NextResponse.json({ error: eU.message }, { status: 500 })
  }
  const liberados = (actualizados ?? []).map(p => p.id as string)

  // Liberar comisiones (soft fail). Con await: en serverless la función puede
  // congelarse al responder y una promesa suelta no llega a ejecutarse.
  const { error: eC } = await admin
    .from('comisiones_merkao')
    .update({ estado: 'liberado' })
    .in('pedido_id', liberados)
    .eq('estado', 'pendiente')
  if (eC) console.error('[auto-release] comisiones falló (pedidos ok):', eC.message)

  console.info(`[auto-release] Liberados ${liberados.length} pedidos:`, liberados)
  return NextResponse.json({ liberados: liberados.length, ids: liberados })
}
