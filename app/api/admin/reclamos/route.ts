import { NextRequest, NextResponse } from 'next/server'
import { diasHabilesRestantes, fechaLima, vencimiento } from '@/lib/dias-habiles'
import { rechazoAdmin, supabaseAdmin } from '@/lib/servidor'

// GET  /api/admin/reclamos  lista el libro de reclamaciones.
// POST /api/admin/reclamos  registra la respuesta ya dada (no envía correo).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

const error400 = (error: string) => NextResponse.json({ error }, { status: 400 })

export async function GET(req: NextRequest) {
  const rechazo = await rechazoAdmin(req)
  if (rechazo) return rechazo

  const { data, error } = await supabaseAdmin()
    .from('reclamaciones')
    .select('id, codigo, tipo, estado, fecha_reclamo, consumidor_nombre, consumidor_email, bien_descripcion, detalle, pedido_consumidor, respuesta, respondido_en')
    .order('fecha_reclamo', { ascending: false })
  if (error) {
    console.error('[admin/reclamos] ' + error.message)
    return NextResponse.json({ error: 'No se pudieron cargar los reclamos.' }, { status: 500 })
  }

  const hoy = fechaLima()
  return NextResponse.json({
    hoy,
    reclamos: (data ?? []).map((r) => {
      const fecha = fechaLima(r.fecha_reclamo)
      const vence = vencimiento(fecha)
      return {
        ...r,
        fecha,
        vence,
        restantes: diasHabilesRestantes(hoy, vence),
        respondido: r.respondido_en ? fechaLima(r.respondido_en) : null,
      }
    }),
  })
}

export async function POST(req: NextRequest) {
  const rechazo = await rechazoAdmin(req)
  if (rechazo) return rechazo

  const body = (await req.json().catch(() => null)) as
    { id?: unknown; fecha?: unknown; respuesta?: unknown; estado?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  const fecha = typeof body?.fecha === 'string' ? body.fecha : ''
  const respuesta = typeof body?.respuesta === 'string' ? body.respuesta.trim() : ''
  const estado = body?.estado === 'desestimado' ? 'desestimado' : 'resuelto'
  // Mediodía de Lima: la fecha no cambia al convertir de zona horaria.
  const instante = new Date(fecha + 'T12:00:00-05:00')

  if (!UUID_RE.test(id)) return error400('Reclamo no válido.')
  if (!FECHA_RE.test(fecha) || Number.isNaN(instante.getTime()) || fechaLima(instante) !== fecha) {
    return error400('Fecha de respuesta no válida.')
  }
  if (!respuesta || respuesta.length > 5000) return error400('Escribe la respuesta (máximo 5000 caracteres).')

  const db = supabaseAdmin()
  const { data: reclamo } = await db.from('reclamaciones').select('fecha_reclamo, respondido_en').eq('id', id).single()
  if (!reclamo) return NextResponse.json({ error: 'Reclamo no encontrado.' }, { status: 404 })
  if (reclamo.respondido_en) {
    return NextResponse.json({ error: 'Ese reclamo ya tiene respuesta registrada.' }, { status: 409 })
  }
  if (fecha < fechaLima(reclamo.fecha_reclamo) || fecha > fechaLima()) {
    return error400('La fecha debe estar entre la del reclamo y hoy.')
  }

  const { data, error } = await db.from('reclamaciones')
    .update({ respuesta, estado, respondido_en: instante.toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('respondido_en', null)
    .select('id')
  if (error || !data?.length) {
    console.error('[admin/reclamos] update: ' + (error?.message ?? 'sin filas'))
    return NextResponse.json({ error: 'No se pudo registrar la respuesta.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
