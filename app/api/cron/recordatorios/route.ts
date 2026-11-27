import { NextRequest, NextResponse } from 'next/server'
import { urlBaja } from '@/lib/baja-token'
import { sendEmail } from '@/lib/email'
import {
  DIAS_ENTRE_RECORDATORIOS, correoRecordatorio, pendientes,
  type Estado, type Producto, type Tienda,
} from '@/lib/recordatorios'
import { rechazoCron, supabaseAdmin, todas } from '@/lib/servidor'

// Cron diario (vercel.json): 15:00 UTC = 10:00 Lima.
// Máximo un correo por vendedor cada 7 días. ?simular=1 no envía ni escribe.

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const rechazo = rechazoCron(req)
  if (rechazo) return rechazo
  const simular = req.nextUrl.searchParams.get('simular') === '1'
  const db = supabaseAdmin()
  const ahora = new Date()

  let lista
  try {
    const [tiendas, productos, estados] = await Promise.all([
      todas<Tienda>((a, b) => db.from('tiendas').select('id, nombre, created_at').order('id').range(a, b)),
      todas<Producto>((a, b) => db.from('productos')
        .select('vendedor_id, nombre, descripcion, imagenes, estado')
        .not('vendedor_id', 'is', null).order('id').range(a, b)),
      // Sin esta tabla no se sabe quién pidió la baja: solo la simulación sigue.
      todas<Estado>((a, b) => db.from('recordatorios_vendedor')
        .select('vendedor_id, ultimo_envio_at, baja_at').order('vendedor_id').range(a, b))
        .catch((e) => { if (simular) return [] as Estado[]; throw e }),
    ])
    lista = pendientes(tiendas, productos, estados, ahora)
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e)
    console.error('[recordatorios] consulta:', mensaje)
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }

  if (simular) {
    return NextResponse.json({
      simulado: true,
      total: lista.length,
      correos: lista.map((p) => {
        const { subject, text } = correoRecordatorio(p, urlBaja(p.vendedorId))
        return { tipo: p.tipo, subject, text }
      }),
    })
  }

  const limite = new Date(ahora.getTime() - DIAS_ENTRE_RECORDATORIOS * 86_400_000 + 3_600_000).toISOString()
  let enviados = 0
  let fallidos = 0
  for (const p of lista) {
    const { data: usuario } = await db.auth.admin.getUserById(p.vendedorId)
    const para = usuario?.user?.email
    if (!para) continue

    // Reservar el turno antes de enviar: dos corridas a la vez no duplican.
    const alta = await db.from('recordatorios_vendedor')
      .upsert({ vendedor_id: p.vendedorId }, { onConflict: 'vendedor_id', ignoreDuplicates: true })
    const turno = alta.error ? alta : await db.from('recordatorios_vendedor')
      .update({ ultimo_envio_at: ahora.toISOString(), ultimo_tipo: p.tipo })
      .eq('vendedor_id', p.vendedorId)
      .is('baja_at', null)
      .or('ultimo_envio_at.is.null,ultimo_envio_at.lt.' + limite)
      .select('envios')
    if (turno.error) {
      console.error('[recordatorios] turno:', turno.error.message)
      fallidos++
      continue
    }
    const fila = (turno.data as { envios: number }[] | null)?.[0]
    if (!fila) continue // otra corrida ya lo tomó, o pidió la baja

    const baja = urlBaja(p.vendedorId)
    const envio = await sendEmail({
      to: para,
      ...correoRecordatorio(p, baja),
      headers: { 'List-Unsubscribe': '<' + baja + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (envio.ok) {
      enviados++
      await db.from('recordatorios_vendedor').update({ envios: fila.envios + 1 }).eq('vendedor_id', p.vendedorId)
    } else {
      fallidos++
      console.error('[recordatorios] envío:', envio.reason, envio.error ?? '')
      // Liberar el turno para reintentar mañana.
      await db.from('recordatorios_vendedor').update({ ultimo_envio_at: null }).eq('vendedor_id', p.vendedorId)
    }
  }

  console.info('[recordatorios] enviados=' + enviados + ' fallidos=' + fallidos)
  return NextResponse.json({ enviados, fallidos }, { status: fallidos ? 500 : 200 })
}
