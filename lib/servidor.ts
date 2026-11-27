// Utilidades solo de servidor para las rutas de cron y de administración.
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'

const SIN_SESION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase no configurado')
  return createClient(url, key, { auth: SIN_SESION })
}

/** Devuelve la respuesta de rechazo, o null si la llamada viene del cron. */
export function rechazoCron(req: NextRequest): NextResponse | null {
  const secreto = process.env.CRON_SECRET
  if (!secreto) {
    console.error('[cron] falta CRON_SECRET: no se ejecuta')
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== 'Bearer ' + secreto) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/** Devuelve la respuesta de rechazo, o null si la sesión es de un admin. */
export async function rechazoAdmin(req: NextRequest): Promise<NextResponse | null> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return NextResponse.json({ error: 'Sin autenticación.' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 500 })
  const cliente = createClient(url, anon, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: SIN_SESION,
  })
  const { data, error } = await cliente.auth.getUser()
  if (error || !data.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  if (!isAdminEmail(data.user.email)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  return null
}

/** Trae todas las filas por páginas (Supabase corta en 1000 por consulta). */
export async function todas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await pagina(desde, desde + 999)
    if (error) throw new Error(error.message)
    const lote = (data ?? []) as T[]
    filas.push(...lote)
    if (lote.length < 1000) return filas
  }
}
