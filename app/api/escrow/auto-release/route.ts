import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cron endpoint: Vercel lo llama una vez al día (ver vercel.json).
// Libera pedidos donde el vendedor marcó entrega hace >7 días y el comprador
// no confirmó ni reportó problema.
//
// Seguridad: Vercel envía Authorization: Bearer ${CRON_SECRET}.
// Si CRON_SECRET no está configurado, el endpoint igual funciona pero sin
// protección (solo expone liberación anticipada de pedidos ya listos).

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

export async function POST(req: NextRequest) {
  // Verificar cron secret si está configurado
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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

  // Liberar pedidos
  const { error: eU } = await admin
    .from('pedidos')
    .update({ estado: 'liberado', escrow_liberado: true })
    .in('id', ids)
  if (eU) {
    console.error('[auto-release] update liberado falló:', eU.message, 'ids:', ids)
    return NextResponse.json({ error: eU.message }, { status: 500 })
  }

  // Liberar comisiones (soft fail)
  void admin
    .from('comisiones_merkao')
    .update({ estado: 'liberado' })
    .in('pedido_id', ids)
    .eq('estado', 'pendiente')
    .then(({ error: eC }) => {
      if (eC) console.error('[auto-release] comisiones falló (pedidos ok):', eC.message)
    })

  console.info(`[auto-release] Liberados ${ids.length} pedidos:`, ids)
  return NextResponse.json({ liberados: ids.length, ids })
}
