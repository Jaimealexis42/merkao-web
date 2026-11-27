import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ADMIN_DIGEST_EMAIL } from '@/lib/admin'
import { diasHabilesRestantes, fechaLima, vencimiento } from '@/lib/dias-habiles'
import { sendEmail } from '@/lib/email'
import { estadoPublicaciones } from '@/lib/publicaciones'
import { resumenDiario, type DatosResumen } from '@/lib/resumen-diario'
import { rechazoCron, supabaseAdmin, todas } from '@/lib/servidor'

// Cron diario (vercel.json): 12:00 UTC = 07:00 Lima.
// ?simular=1 devuelve el correo sin enviarlo.

export const maxDuration = 60

type Tienda = { id: string; nombre: string | null; created_at: string }

/** Si una sección falla, el correo lo dice en vez de reportar cero. */
async function intentar<T>(nombre: string, consulta: () => Promise<T>): Promise<T | null> {
  try {
    return await consulta()
  } catch (e) {
    console.error('[resumen] ' + nombre + ':', e instanceof Error ? e.message : e)
    return null
  }
}

async function reunir(db: SupabaseClient, ahora: Date): Promise<DatosResumen> {
  const hoy = fechaLima(ahora)
  const ayer = ahora.getTime() - 86_400_000
  const tiendas = () =>
    todas<Tienda>((a, b) => db.from('tiendas').select('id, nombre, created_at').order('id').range(a, b))

  const [reclamos, nuevos, pedidos, soporte, publicaciones] = await Promise.all([
    intentar('reclamos', async () => {
      const filas = await todas<{ codigo: string; tipo: string; fecha_reclamo: string }>((a, b) =>
        db.from('reclamaciones').select('codigo, tipo, fecha_reclamo')
          .is('respondido_en', null).order('fecha_reclamo').range(a, b))
      return filas.map((r) => {
        const fecha = fechaLima(r.fecha_reclamo)
        const vence = vencimiento(fecha)
        return { codigo: r.codigo, tipo: r.tipo, fecha, vence, restantes: diasHabilesRestantes(hoy, vence) }
      })
    }),
    intentar('nuevos', async () => {
      const { count, error } = await db.from('productos')
        .select('id', { count: 'exact', head: true })
        .not('vendedor_id', 'is', null).gte('created_at', new Date(ayer).toISOString())
      if (error) throw new Error(error.message)
      const vendedores = (await tiendas())
        .filter((t) => Date.parse(t.created_at) >= ayer)
        .map((t) => t.nombre ?? 'Sin nombre')
      return { vendedores, productos: count ?? 0 }
    }),
    intentar('pedidos', async () => {
      const filas = await todas<{ estado: string; created_at: string }>((a, b) =>
        db.from('pedidos').select('estado, created_at').order('id').range(a, b))
      const enCurso: Record<string, number> = {}
      for (const p of filas) {
        if (p.estado === 'liberado' || p.estado === 'cancelado') continue
        enCurso[p.estado] = (enCurso[p.estado] ?? 0) + 1
      }
      return { nuevos: filas.filter((p) => Date.parse(p.created_at) >= ayer).length, enCurso }
    }),
    intentar('soporte', async () => {
      const mensajes = await todas<{ vendedor_id: string; autor: string; created_at: string }>((a, b) =>
        db.from('mensajes_soporte').select('vendedor_id, autor, created_at').order('created_at').range(a, b))
      // Por hilo: primer mensaje del vendedor posterior a la última respuesta.
      const esperando = new Map<string, string>()
      for (const m of mensajes) {
        if (m.autor === 'admin') esperando.delete(m.vendedor_id)
        else if (!esperando.has(m.vendedor_id)) esperando.set(m.vendedor_id, m.created_at)
      }
      const lista = esperando.size ? await tiendas() : []
      return [...esperando].map(([id, desde]) => ({
        nombre: lista.find((t) => t.id === id)?.nombre ?? 'Vendedor sin tienda',
        desde: fechaLima(desde),
      }))
    }),
    estadoPublicaciones(),
  ])

  return { hoy, reclamos, nuevos, pedidos, soporte, publicaciones }
}

export async function GET(req: NextRequest) {
  const rechazo = rechazoCron(req)
  if (rechazo) return rechazo

  const correo = resumenDiario(await reunir(supabaseAdmin(), new Date()))
  if (req.nextUrl.searchParams.get('simular') === '1') {
    return NextResponse.json({ simulado: true, ...correo })
  }

  const html = '<pre style="font:14px/1.6 system-ui,sans-serif;white-space:pre-wrap">' +
    correo.text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>'
  const envio = await sendEmail({ to: ADMIN_DIGEST_EMAIL, subject: correo.subject, text: correo.text, html })
  if (!envio.ok) {
    console.error('[resumen] no se envió:', envio.reason, envio.error ?? '')
    return NextResponse.json({ enviado: false, motivo: envio.reason }, { status: 500 })
  }
  return NextResponse.json({ enviado: true })
}
