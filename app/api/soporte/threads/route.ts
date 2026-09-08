import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'

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

type Mensaje = {
  id: string
  vendedor_id: string
  autor: 'vendedor' | 'admin'
  texto: string
  leido: boolean
  created_at: string
}

export type Thread = {
  vendedor_id: string
  nombre: string
  mensajes: Mensaje[]
  nuevo: boolean  // true if there are unread vendor messages (no admin reply yet)
  ultimo: string
  ultimo_at: string
}

// GET /api/soporte/threads — admin reads all vendor conversations
export async function GET(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Sin autenticación.' }, { status: 401 })

  const authClient = buildAuthedClient(token)
  if (!authClient) return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })

  const { data: userData, error: eUser } = await authClient.auth.getUser()
  if (eUser || !userData.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  if (!isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const { data: msgs, error: eMsgs } = await admin
    .from('mensajes_soporte')
    .select('id, vendedor_id, autor, texto, leido, created_at')
    .order('created_at', { ascending: true })

  if (eMsgs) {
    console.error('[soporte/threads] fetch:', eMsgs.message)
    return NextResponse.json({ error: 'Error cargando mensajes.' }, { status: 500 })
  }

  const allMsgs = (msgs ?? []) as Mensaje[]
  const vendedorIds = [...new Set(allMsgs.map((m) => m.vendedor_id))]

  const { data: tiendas } = await admin
    .from('tiendas')
    .select('id, nombre')
    .in('id', vendedorIds)

  const tiendaMap = Object.fromEntries(
    (tiendas ?? []).map((t: { id: string; nombre: string }) => [t.id, t.nombre]),
  )

  const threadMap = new Map<string, Thread>()

  for (const msg of allMsgs) {
    const vid = msg.vendedor_id
    if (!threadMap.has(vid)) {
      threadMap.set(vid, {
        vendedor_id: vid,
        nombre: tiendaMap[vid] ?? `Vendedor ${vid.slice(0, 8)}`,
        mensajes: [],
        nuevo: false,
        ultimo: '',
        ultimo_at: '',
      })
    }
    const thread = threadMap.get(vid)!
    thread.mensajes.push(msg)
    thread.ultimo = msg.texto
    thread.ultimo_at = msg.created_at
  }

  // A thread is "nuevo" when the last message is from the vendor (admin hasn't replied yet)
  for (const thread of threadMap.values()) {
    const last = thread.mensajes[thread.mensajes.length - 1]
    thread.nuevo = last?.autor === 'vendedor'
  }

  const threads = [...threadMap.values()].sort(
    (a, b) => new Date(b.ultimo_at).getTime() - new Date(a.ultimo_at).getTime(),
  )

  return NextResponse.json({ threads })
}
