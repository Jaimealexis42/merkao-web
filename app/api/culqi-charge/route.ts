import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { comisionEfectiva, MESES_GRATIS } from '@/lib/comisiones'
import { calcularPrecios } from '@/lib/precios'

// CORS abierto: protegido por rate-limit + validación de inputs + verificación
// server-side del precio. El navegador/app móvil necesita estos headers.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
} as const

function json(body: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(body, init)
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v)
  return res
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// ── Dos clientes Supabase ──────────────────────────────────────────────────
// anon: lee productos respetando RLS (productos pausados = no comprables).
// admin: INSERT/UPDATE de pedidos vía service_role (bypass RLS necesario porque
//        el comprador no tiene JWT propio en guest checkout).
let _anon: SupabaseClient | null = null
function getAnonClient(): SupabaseClient | null {
  if (_anon) return _anon
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  _anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return _anon
}

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

// ── Reembolso automático Culqi ────────────────────────────────────────────
// Llama a la API de Culqi para reembolsar un cargo ya confirmado.
// Solo se usa cuando el cobro pasó pero la actualización del pedido falló.
async function refundCulqi(chargeId: string, amountCentimos: number): Promise<boolean> {
  try {
    const res = await fetch('https://api.culqi.com/v2/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CULQI_SECRET_KEY}`,
      },
      body: JSON.stringify({
        charge_id: chargeId,
        amount: amountCentimos,
        reason: 'solicitud_comprador',
      }),
    })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok || data.object === 'error') {
      console.error('[culqi-charge] REEMBOLSO FALLÓ:', JSON.stringify(data))
      return false
    }
    console.info('[culqi-charge] Reembolso exitoso:', chargeId, amountCentimos, 'centimos')
    return true
  } catch (e) {
    console.error('[culqi-charge] REEMBOLSO ERROR:', e)
    return false
  }
}

// ── Validaciones ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CULQI_TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/
const MAX_TEXT = 500

function clipString(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim().slice(0, max)
  return trimmed.length > 0 ? trimmed : null
}

// ── Handler principal ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {

  // 0a. Claves de entorno
  const anon = getAnonClient()
  const admin = getAdminClient()
  if (!anon || !admin) {
    console.error('[culqi-charge] envs faltantes')
    return json({ error: 'Servicio de pagos no disponible. Contacta soporte.' }, { status: 500 })
  }

  // 0b. Rate limit: 5 intentos/minuto por IP
  const ip = getClientIp(req)
  const rl = checkRateLimit(`culqi:${ip}`)
  if (!rl.ok) {
    return json(
      { error: 'Demasiados intentos. Espera un minuto antes de volver a intentar.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  // 1. Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const {
    token,
    email,
    producto_id,
    cantidad,
    nombre_comprador,
    telefono,
    direccion,
    notas,
    pais_comprador,
    metodo_pago,
  } = body as Record<string, unknown>

  // 2. Validar inputs (monto del navegador ignorado — se calcula en el server)
  if (typeof token !== 'string' || !CULQI_TOKEN_RE.test(token)) {
    return json({ error: 'Token de pago inválido.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (typeof producto_id !== 'string' || !UUID_RE.test(producto_id)) {
    return json({ error: 'producto_id inválido.' }, { status: 400 })
  }
  const cantidadNum = cantidad != null ? Number(cantidad) : 1
  if (!Number.isInteger(cantidadNum) || cantidadNum < 1 || cantidadNum > 1000) {
    return json({ error: 'Cantidad fuera de rango (1–1000).' }, { status: 400 })
  }
  const paisNorm = (clipString(pais_comprador, 4) ?? 'PE').toUpperCase()
  if (!/^[A-Z]{2,3}$/.test(paisNorm)) {
    return json({ error: 'pais_comprador inválido.' }, { status: 400 })
  }
  const metodoNorm = (clipString(metodo_pago, 24) ?? 'tarjeta').toLowerCase()
  if (!['yape', 'plin', 'tarjeta', 'efectivo', 'transferencia'].includes(metodoNorm)) {
    return json({ error: 'Método de pago inválido.' }, { status: 400 })
  }

  const nombreSafe    = clipString(nombre_comprador, 120) ?? ''
  const telefonoSafe  = clipString(telefono, 32)
  const direccionSafe = clipString(direccion, 300)
  const notasSafe     = clipString(notas, 1000)

  // 3. Leer producto desde la DB (anon respeta RLS: si está pausado → no comprable)
  const { data: producto, error: eProducto } = await anon
    .from('productos')
    .select('id, nombre, vendedor_id, imagenes, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, categoria_id')
    .eq('id', producto_id)
    .eq('estado', 'activo')
    .not('vendedor_id', 'is', null)   // productos demo no son comprables
    .single()

  if (eProducto || !producto) {
    return json({ error: 'Producto no disponible.' }, { status: 404 })
  }

  // 4. Calcular precio en el SERVER (no se confía en el monto del navegador)
  const esMayoreo = !!(
    producto.precio_mayoreo &&
    producto.cantidad_minima_mayoreo &&
    cantidadNum >= producto.cantidad_minima_mayoreo
  )
  const precioUnitario = esMayoreo ? (producto.precio_mayoreo as number) : (producto.precio as number)
  const costoEnvio     = +(producto.costo_envio ?? 0)

  const { total: totalCalc, igv: igvCalc, arancel: arancelCalc } =
    calcularPrecios(precioUnitario * cantidadNum, paisNorm)

  const totalSoles    = +(totalCalc + costoEnvio).toFixed(2)
  const totalCentimos = Math.round(totalSoles * 100)

  if (totalCentimos < 100) {
    return json({ error: 'El total mínimo es S/ 1.00.' }, { status: 400 })
  }
  if (totalCentimos > 5_000_000) {
    return json({ error: 'El total supera el límite permitido.' }, { status: 400 })
  }

  // 5. GUARDAR PEDIDO COMO "pendiente_pago" ANTES DE COBRAR
  //    Si el INSERT falla (p. ej. schema desactualizado), devolvemos error SIN cobrar.
  //    Requiere: comprador_id nullable, columna notas existente (ver SQL en task 2).
  const { data: pedidoPre, error: ePre } = await admin
    .from('pedidos')
    .insert([{
      vendedor_id:       producto.vendedor_id,
      nombre_comprador:  nombreSafe,
      email_comprador:   email,
      telefono:          telefonoSafe,
      direccion_entrega: direccionSafe,
      notas:             notasSafe,
      pais_comprador:    paisNorm,
      igv:               +(igvCalc).toFixed(2),
      arancel:           +(arancelCalc).toFixed(2),
      total:             totalSoles,
      metodo_pago:       metodoNorm,
      estado:            'pendiente_pago',
      escrow_liberado:   false,
      culqi_charge_id:   null,
    }])
    .select('id')
    .single()

  if (ePre) {
    console.error('[culqi-charge] Pre-save falló (NO se cobró):', ePre.message)
    return json(
      { error: 'No pudimos procesar tu pedido; no se te cobró nada. Intenta de nuevo o contacta soporte.' },
      { status: 500 },
    )
  }

  const pedidoId = pedidoPre.id as string

  // 6. COBRAR CON CULQI (ahora que el pedido está guardado)
  let culqiData: Record<string, unknown>
  try {
    const culqiRes = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.CULQI_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount:        totalCentimos,
        currency_code: 'PEN',
        email,
        source_id:     token,
        description:   `Merkao – pedido de ${nombreSafe || email}`,
      }),
    })
    culqiData = await culqiRes.json()

    if (!culqiRes.ok || culqiData.object === 'error') {
      // Cobro rechazado: marcar pedido como cancelado y devolver error claro
      await admin.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId)
      const msg =
        (culqiData.user_message as string) ??
        (culqiData.merchant_message as string) ??
        'El cobro fue rechazado.'
      return json({ error: msg }, { status: 402 })
    }
  } catch {
    await admin.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId)
    return json(
      { error: 'No se pudo conectar con el proveedor de pagos. No se te cobró nada.' },
      { status: 502 },
    )
  }

  const chargeId = culqiData.id as string

  // 7. CONFIRMAR PEDIDO: actualizar a "pagado" con el charge_id real
  const { error: eUpdate } = await admin
    .from('pedidos')
    .update({ estado: 'pagado', culqi_charge_id: chargeId })
    .eq('id', pedidoId)

  if (eUpdate) {
    // CRÍTICO: el cobro pasó pero no pudimos registrar el pedido → reembolso automático
    console.error('[culqi-charge] CRÍTICO: cobro OK pero update falló:', eUpdate.message,
      'charge_id:', chargeId, 'pedido_id:', pedidoId)
    const refunded = await refundCulqi(chargeId, totalCentimos)
    await admin.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId)
    return json(
      {
        error: refunded
          ? 'Ocurrió un error interno. Tu pago será reembolsado en 3–5 días hábiles.'
          : `Error interno. Contacta soporte con referencia: ${chargeId}`,
      },
      { status: 500 },
    )
  }

  // 8. Snapshot del item (soft fail — el pedido principal ya está confirmado)
  void admin
    .from('pedido_items')
    .insert([{
      pedido_id:       pedidoId,
      producto_id:     producto.id,
      nombre_producto: producto.nombre,
      cantidad:        cantidadNum,
      precio_unitario: precioUnitario,
      subtotal:        +(precioUnitario * cantidadNum).toFixed(2),
      imagen_url:      Array.isArray(producto.imagenes) ? (producto.imagenes[0] ?? null) : null,
    }])
    .then(({ error: eItem }) => {
      if (eItem) console.error('[culqi-charge] pedido_items falló (pedido OK):', eItem.message, 'pedido:', pedidoId)
    })

  // 9. Ledger de split Merkao (soft fail — el pedido ya está pagado)
  const montoTotal    = totalSoles
  const categoriaId   = typeof producto.categoria_id === 'number' ? producto.categoria_id : 0

  void admin
    .from('tiendas')
    .select('created_at')
    .eq('id', producto.vendedor_id)
    .maybeSingle()
    .then(({ data: tienda }) => {
      const mesesActivo = tienda?.created_at
        ? Math.floor((Date.now() - new Date(tienda.created_at as string).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0
      void MESES_GRATIS
      const tasa         = comisionEfectiva(categoriaId, mesesActivo)
      const montoMerkao  = +(montoTotal * tasa).toFixed(2)
      const montoVendedor = +(montoTotal - montoMerkao).toFixed(2)
      return admin.from('comisiones_merkao').insert([{
        pedido_id:      pedidoId,
        monto_total:    montoTotal,
        monto_merkao:   montoMerkao,
        monto_vendedor: montoVendedor,
        estado:         'pendiente',
      }])
    })
    .then(({ error: eComision }) => {
      if (eComision) console.error('[culqi-charge] comisiones_merkao falló (pedido OK):', eComision.message, 'pedido:', pedidoId)
    })

  return json({ success: true, pedido_id: pedidoId })
}
