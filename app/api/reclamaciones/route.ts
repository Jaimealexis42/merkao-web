import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'
import {
  PROVEEDOR,
  constanciaHtml,
  constanciaSubject,
  constanciaText,
  type ReclamacionPayload,
  type TipoBien,
  type TipoDocumento,
  type TipoReclamo,
} from '@/lib/reclamaciones'

// ── Libro de Reclamaciones Virtual (Indecopi, Ley 29571).
// Persistencia + correlativo + constancia por email. Validación server-side
// estricta — los campos del Anexo I son obligatorios por norma; rechazar
// payloads incompletos no es cosmético, es cumplimiento.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIPO_DOC: TipoDocumento[] = ['DNI', 'CE', 'PASAPORTE']
const TIPO_BIEN: TipoBien[] = ['PRODUCTO', 'SERVICIO']
const TIPO_RECL: TipoReclamo[] = ['RECLAMO', 'QUEJA']
const MAX_TEXT = 4000
const MAX_SHORT = 200

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

function reqStr(v: unknown, max = MAX_SHORT): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t || t.length > max) return null
  return t
}

function reqDoc(tipo: TipoDocumento, num: string): boolean {
  if (tipo === 'DNI') return /^\d{8}$/.test(num)
  if (tipo === 'CE') return /^\d{9,12}$/.test(num)
  return num.length >= 5 && num.length <= 20 // pasaporte
}

export async function POST(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Servicio no disponible. Contacta soporte.' },
      { status: 500 },
    )
  }

  const ip = getClientIp(req)
  // 3 reclamos por IP por hora es generoso; bloquea spam sin cortar uso legítimo.
  const rl = checkRateLimit(`reclamacion:${ip}`, { windowMs: 60 * 60 * 1000, max: 3 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Demasiados envíos. Intenta más tarde.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
        },
      },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  // ── Validación campo por campo (Anexo I)
  const nombre = reqStr(body.nombre)
  const documentoTipoRaw = reqStr(body.documentoTipo, 20)
  const documentoNum = reqStr(body.documentoNum, 20)
  const domicilio = reqStr(body.domicilio, 300)
  const telefono = reqStr(body.telefono, 30)
  const email = reqStr(body.email, 200)
  const esMenor = body.esMenor === true
  const apoderadoNombre = esMenor ? reqStr(body.apoderadoNombre, MAX_SHORT) : null
  const apoderadoDocumento = esMenor ? reqStr(body.apoderadoDocumento, 30) : null

  const bienTipoRaw = reqStr(body.bienTipo, 20)
  const bienMontoRaw = body.bienMonto
  const bienDescripcion = reqStr(body.bienDescripcion, 1000)

  const tipoRaw = reqStr(body.tipo, 20)
  const detalle = reqStr(body.detalle, MAX_TEXT)
  const pedidoConsumidor = reqStr(body.pedidoConsumidor, MAX_TEXT)

  if (!nombre) return NextResponse.json({ error: 'Nombre requerido.' }, { status: 400 })
  if (!documentoTipoRaw || !(TIPO_DOC as string[]).includes(documentoTipoRaw)) {
    return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 })
  }
  const documentoTipo = documentoTipoRaw as TipoDocumento
  if (!documentoNum || !reqDoc(documentoTipo, documentoNum)) {
    return NextResponse.json({ error: 'Número de documento inválido.' }, { status: 400 })
  }
  if (!domicilio) return NextResponse.json({ error: 'Domicilio requerido.' }, { status: 400 })
  if (!telefono) return NextResponse.json({ error: 'Teléfono requerido.' }, { status: 400 })
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (esMenor && (!apoderadoNombre || !apoderadoDocumento)) {
    return NextResponse.json(
      { error: 'Si el consumidor es menor, completa los datos del apoderado.' },
      { status: 400 },
    )
  }

  if (!bienTipoRaw || !(TIPO_BIEN as string[]).includes(bienTipoRaw)) {
    return NextResponse.json({ error: 'Tipo de bien inválido.' }, { status: 400 })
  }
  const bienTipo = bienTipoRaw as TipoBien
  const bienMonto =
    typeof bienMontoRaw === 'number'
      ? bienMontoRaw
      : typeof bienMontoRaw === 'string'
        ? Number(bienMontoRaw)
        : NaN
  if (!Number.isFinite(bienMonto) || bienMonto < 0 || bienMonto > 1_000_000) {
    return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })
  }
  if (!bienDescripcion) {
    return NextResponse.json({ error: 'Descripción del bien requerida.' }, { status: 400 })
  }

  if (!tipoRaw || !(TIPO_RECL as string[]).includes(tipoRaw)) {
    return NextResponse.json({ error: 'Tipo (reclamo/queja) requerido.' }, { status: 400 })
  }
  const tipo = tipoRaw as TipoReclamo
  if (!detalle) return NextResponse.json({ error: 'Detalle requerido.' }, { status: 400 })
  if (!pedidoConsumidor) {
    return NextResponse.json({ error: 'Pedido del consumidor requerido.' }, { status: 400 })
  }

  // ── Código correlativo (atómico vía función SQL).
  const { data: codData, error: eCod } = await admin.rpc('siguiente_codigo_reclamacion')
  if (eCod || typeof codData !== 'string') {
    console.error('[reclamaciones] siguiente_codigo_reclamacion falló:', eCod?.message)
    return NextResponse.json({ error: 'No se pudo generar el código.' }, { status: 500 })
  }
  const codigo = codData

  const userAgent = req.headers.get('user-agent') ?? null
  const fechaIso = new Date().toISOString()

  // ── Persistir
  const { error: eIns } = await admin.from('reclamaciones').insert({
    codigo,
    fecha_reclamo: fechaIso,
    consumidor_nombre: nombre,
    consumidor_documento_tipo: documentoTipo,
    consumidor_documento_num: documentoNum,
    consumidor_domicilio: domicilio,
    consumidor_telefono: telefono,
    consumidor_email: email,
    consumidor_es_menor: esMenor,
    apoderado_nombre: apoderadoNombre,
    apoderado_documento: apoderadoDocumento,
    bien_tipo: bienTipo,
    bien_monto: bienMonto,
    bien_descripcion: bienDescripcion,
    tipo,
    detalle,
    pedido_consumidor: pedidoConsumidor,
    ip,
    user_agent: userAgent,
    estado: 'recibido',
  })
  if (eIns) {
    console.error('[reclamaciones] insert falló:', eIns.message)
    return NextResponse.json({ error: 'No se pudo registrar el reclamo.' }, { status: 500 })
  }

  // ── Constancia por email. SIEMPRE intentamos; si falla guardamos el error
  // pero NO revertimos el reclamo (Indecopi exige que quede registrado).
  const payload: ReclamacionPayload = {
    codigo,
    fechaReclamo: fechaIso,
    consumidor: {
      nombre,
      documentoTipo,
      documentoNum,
      domicilio,
      telefono,
      email,
      esMenor,
      apoderadoNombre: apoderadoNombre ?? undefined,
      apoderadoDocumento: apoderadoDocumento ?? undefined,
    },
    bien: { tipo: bienTipo, monto: bienMonto, descripcion: bienDescripcion },
    reclamo: { tipo, detalle, pedido: pedidoConsumidor },
  }

  const sendRes = await sendEmail({
    to: email,
    cc: [PROVEEDOR.emailContacto],
    subject: constanciaSubject(codigo),
    html: constanciaHtml(payload),
    text: constanciaText(payload),
  })

  if (sendRes.ok) {
    await admin
      .from('reclamaciones')
      .update({ constancia_enviada: true, constancia_enviada_en: new Date().toISOString() })
      .eq('codigo', codigo)
  } else {
    const errMsg = sendRes.reason === 'not_configured' ? 'email_no_configurado' : sendRes.error ?? 'desconocido'
    await admin
      .from('reclamaciones')
      .update({ constancia_enviada: false, constancia_error: errMsg.slice(0, 500) })
      .eq('codigo', codigo)
  }

  return NextResponse.json({
    success: true,
    codigo,
    fechaReclamo: fechaIso,
    constanciaEnviada: sendRes.ok,
  })
}
