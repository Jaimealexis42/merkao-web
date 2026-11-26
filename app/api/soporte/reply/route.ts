import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'
import { sendEmail } from '@/lib/email'

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

// POST /api/soporte/reply — admin replies to a vendor thread
export async function POST(req: NextRequest) {
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

  const body = (await req.json().catch(() => ({}))) as { vendedor_id?: string; texto?: string }
  const vendedorId = (body.vendedor_id ?? '').trim()
  const texto = (body.texto ?? '').trim()
  if (!vendedorId || !texto || texto.length > 2000) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  // service_role bypasses RLS — admin can insert with autor='admin'
  const { data: msg, error: eInsert } = await admin
    .from('mensajes_soporte')
    .insert({ vendedor_id: vendedorId, autor: 'admin', texto, leido: false })
    .select('id, autor, texto, leido, created_at')
    .single()

  if (eInsert) {
    console.error('[soporte/reply] insert:', eInsert.message)
    return NextResponse.json({ error: 'Error enviando respuesta.' }, { status: 500 })
  }

  // Notify vendor by email (non-blocking)
  try {
    const { data: vendorData } = await admin.auth.admin.getUserById(vendedorId)
    const vendorEmail = vendorData?.user?.email
    if (vendorEmail) {
      sendEmail({
        to: vendorEmail,
        subject: 'Tienes un mensaje del equipo Merkao',
        text: `El equipo de Merkao te escribió:\n\n${texto}\n\nVer en: https://merkao.org/vendedor/soporte`,
        html: `<p>El equipo de <strong>Merkao</strong> te envió un mensaje:</p><blockquote style="border-left:3px solid #2563eb;margin:0;padding:0 12px;color:#374151">${texto}</blockquote><p><a href="https://merkao.org/vendedor/soporte">Ver mensaje en tu panel →</a></p>`,
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({ mensaje: msg })
}
