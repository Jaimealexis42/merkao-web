import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { ADMIN_NOTIFY_EMAIL } from '@/lib/admin'

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

function extractToken(req: NextRequest): string {
  return (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
}

// GET /api/soporte — vendor loads their thread; marks admin messages as read
export async function GET(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })

  const token = extractToken(req)
  if (!token) return NextResponse.json({ error: 'Sin autenticación.' }, { status: 401 })

  const authClient = buildAuthedClient(token)
  if (!authClient) return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })

  const { data: userData, error: eUser } = await authClient.auth.getUser()
  if (eUser || !userData.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })

  const vendedorId = userData.user.id

  const { data: msgs, error: eMsgs } = await admin
    .from('mensajes_soporte')
    .select('id, autor, texto, leido, created_at')
    .eq('vendedor_id', vendedorId)
    .order('created_at', { ascending: true })

  if (eMsgs) {
    console.error('[soporte] fetch msgs:', eMsgs.message)
    return NextResponse.json({ error: 'Error cargando mensajes.' }, { status: 500 })
  }

  // Mark admin messages as read now that vendor has seen them
  const unreadIds = (msgs ?? [])
    .filter((m) => m.autor === 'admin' && !m.leido)
    .map((m) => m.id as string)

  if (unreadIds.length > 0) {
    await admin.from('mensajes_soporte').update({ leido: true }).in('id', unreadIds)
  }

  return NextResponse.json({ mensajes: msgs ?? [] })
}

// POST /api/soporte — vendor sends a message and notifies admin by email
export async function POST(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })

  const token = extractToken(req)
  if (!token) return NextResponse.json({ error: 'Sin autenticación.' }, { status: 401 })

  const authClient = buildAuthedClient(token)
  if (!authClient) return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })

  const { data: userData, error: eUser } = await authClient.auth.getUser()
  if (eUser || !userData.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { texto?: string }
  const texto = (body.texto ?? '').trim()
  if (!texto || texto.length > 2000) {
    return NextResponse.json({ error: 'Mensaje inválido.' }, { status: 400 })
  }

  const vendedor = userData.user
  const { data: msg, error: eInsert } = await admin
    .from('mensajes_soporte')
    .insert({ vendedor_id: vendedor.id, autor: 'vendedor', texto })
    .select('id, autor, texto, leido, created_at')
    .single()

  if (eInsert) {
    console.error('[soporte] insert msg:', eInsert.message)
    return NextResponse.json({ error: 'Error enviando mensaje.' }, { status: 500 })
  }

  const nombre = (vendedor.user_metadata?.full_name as string | undefined) ?? vendedor.email ?? vendedor.id
  sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `Soporte Merkao — mensaje de ${nombre}`,
    text: `${nombre} escribió:\n\n${texto}\n\nResponder en: https://merkao.pe/admin/soporte`,
    html: `<p><strong>${nombre}</strong> te escribió desde el panel de vendedor:</p><blockquote style="border-left:3px solid #e5e7eb;margin:0;padding:0 12px;color:#374151">${texto}</blockquote><p><a href="https://merkao.pe/admin/soporte">Ver conversación →</a></p>`,
  }).catch(() => {})

  return NextResponse.json({ mensaje: msg })
}
