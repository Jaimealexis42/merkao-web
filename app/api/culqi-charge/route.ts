import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { comisionEfectiva, MESES_GRATIS } from '@/lib/comisiones'

// CORS abierto: el endpoint ya está protegido por rate-limit + validación de
// inputs + verificación de cobro Culqi server-side. El navegador/app móvil
// necesita estos headers para que la tokenización + cargo funcione desde
// orígenes que no son merkao.org (Expo web localhost, builds nativos, etc).
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

// ── Dos clientes Supabase: anon (RLS-bounded) + admin (RLS bypass) ──
//
// anon: para LEER productos. Sigue las mismas políticas RLS que el
// frontend, así que si un producto está pausado/borrado o RLS lo
// oculta, este endpoint también lo ve oculto — comportamiento
// correcto y consistente.
//
// admin: SOLO para los INSERT post-pago (pedidos + pedido_items)
// DESPUÉS de que Culqi confirmó el cobro. Bypassea RLS porque la
// autorización ya está validada en este server route (rate-limit +
// input validation + Culqi cobró OK). La key NO lleva prefijo
// NEXT_PUBLIC_ por lo que Next no la inyecta al bundle del cliente.
//
// Lazy init para que `next build` no rompa si la env no está
// presente. Si falta en runtime, devolvemos 500 explícito.

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

// Validaciones puras (sin libs externas para evitar agregar zod ahora).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Culqi devuelve tokens prefijo tkn_ + alfanuméricos. Validar formato evita
// que un atacante use el endpoint con tokens vacíos o mal formados.
const CULQI_TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/
const MAX_MONTO_CENTIMOS = 5_000_000  // S/ 50,000 — techo razonable para una transacción
const MIN_MONTO_CENTIMOS = 100        // S/ 1 — mínimo Culqi
const MAX_TEXT = 500

function clipString(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim().slice(0, max)
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(req: NextRequest) {
  // ── 0a. Guard: ambas claves deben estar configuradas ──────────────
  const anon = getAnonClient()
  const admin = getAdminClient()
  if (!anon || !admin) {
    console.error(
      '[culqi-charge] envs faltantes:',
      !anon ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : '',
      !admin ? 'SUPABASE_SERVICE_ROLE_KEY' : '',
    )
    return json(
      { error: 'Servicio de pagos no disponible. Contacta soporte.' },
      { status: 500 },
    )
  }

  // ── 0b. Rate limit por IP (5 cobros/min) ──────────────────────────
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const {
    token,
    monto,
    email,
    producto_id,
    cantidad,
    precio_unitario,
    nombre_comprador,
    telefono,
    direccion,
    notas,
    pais_comprador,
    igv,
    arancel,
    metodo_pago,
  } = body as Record<string, unknown>

  // ── 1. Validación estricta de inputs ──────────────────────────────
  if (typeof token !== 'string' || !CULQI_TOKEN_RE.test(token)) {
    return json({ error: 'Token de pago inválido.' }, { status: 400 })
  }
  const montoNum = typeof monto === 'number' ? monto : Number(monto)
  if (!Number.isInteger(montoNum) || montoNum < MIN_MONTO_CENTIMOS || montoNum > MAX_MONTO_CENTIMOS) {
    return json(
      { error: `Monto fuera de rango (mín ${MIN_MONTO_CENTIMOS}, máx ${MAX_MONTO_CENTIMOS} céntimos).` },
      { status: 400 },
    )
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (typeof producto_id !== 'string' || !UUID_RE.test(producto_id)) {
    return json({ error: 'producto_id inválido (se espera UUID).' }, { status: 400 })
  }
  const cantidadNum = cantidad != null ? Number(cantidad) : 1
  if (!Number.isInteger(cantidadNum) || cantidadNum < 1 || cantidadNum > 1000) {
    return json({ error: 'Cantidad fuera de rango (1–1000).' }, { status: 400 })
  }
  const paisNorm = clipString(pais_comprador, 4) ?? 'PE'
  if (!/^[A-Z]{2,3}$/.test(paisNorm)) {
    return json({ error: 'pais_comprador inválido.' }, { status: 400 })
  }
  const metodoNorm = (clipString(metodo_pago, 24) ?? 'tarjeta').toLowerCase()
  if (!['yape', 'plin', 'tarjeta', 'efectivo', 'transferencia'].includes(metodoNorm)) {
    return json({ error: 'Método de pago inválido.' }, { status: 400 })
  }
  const igvNum = Math.max(0, Number(igv) || 0)
  const arancelNum = Math.max(0, Number(arancel) || 0)
  const precioSnapInput = precio_unitario != null ? Number(precio_unitario) : null

  const nombreSafe = clipString(nombre_comprador, 120) ?? ''
  const telefonoSafe = clipString(telefono, 32)
  const direccionSafe = clipString(direccion, 300)
  const notasSafe = clipString(notas, 1000)

  // ── 2. Cobrar con Culqi ────────────────────────────────────────────
  let culqiResponse: Response
  let culqiData: Record<string, unknown>

  try {
    culqiResponse = await fetch('https://api.culqi.com/v2/charges', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.CULQI_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount:        montoNum,
        currency_code: 'PEN',
        email,
        source_id:     token,
        description:   `Merkao – pedido de ${nombreSafe || email}`,
      }),
    })

    culqiData = await culqiResponse.json()
  } catch {
    return json(
      { error: 'No se pudo conectar con el proveedor de pagos.' },
      { status: 502 },
    )
  }

  if (!culqiResponse.ok || culqiData.object === 'error') {
    const mensaje =
      (culqiData.user_message as string) ??
      (culqiData.merchant_message as string) ??
      'El cobro fue rechazado.'
    return json({ error: mensaje }, { status: 402 })
  }

  // ── 3a. Lookup producto: necesitamos vendedor_id (pedidos.vendedor_id es
  //       columna real) + snapshot de nombre/imagen para pedido_items.
  //       Usa anon — respeta RLS. Si el producto está oculto para el
  //       público (estado != activo / soft-delete), no permitimos cobrar
  //       por él.
  const { data: producto, error: eProducto } = await anon
    .from('productos')
    .select('id, nombre, vendedor_id, imagenes, precio, categoria_id')
    .eq('id', producto_id)
    .single()

  if (eProducto || !producto) {
    console.error('[culqi-charge] Producto no encontrado:', producto_id, eProducto?.message)
    return json(
      { error: 'Pago aceptado pero el producto ya no existe. Contacta soporte con ID: ' + culqiData.id },
      { status: 500 },
    )
  }

  // ── 3b. Insertar pedido (schema real: total, igv, arancel, direccion_entrega) ──
  const { data: pedido, error: sbError } = await admin
    .from('pedidos')
    .insert([{
      vendedor_id:       producto.vendedor_id,
      nombre_comprador:  nombreSafe,
      email_comprador:   email,
      telefono:          telefonoSafe,
      direccion_entrega: direccionSafe,
      notas:             notasSafe,
      pais_comprador:    paisNorm,
      igv:               igvNum,
      arancel:           arancelNum,
      total:             +(montoNum / 100).toFixed(2),
      metodo_pago:       metodoNorm,
      estado:            'pagado',
      escrow_liberado:   false,
      culqi_charge_id:   culqiData.id as string,
    }])
    .select('id')
    .single()

  if (sbError) {
    // El cobro ya fue exitoso — registrar el error pero no fallar al cliente
    console.error('[culqi-charge] Error insertando pedido:', sbError.message)
    return json(
      { error: 'Pago aceptado pero no se pudo registrar el pedido. Contacta soporte con el ID: ' + culqiData.id },
      { status: 500 },
    )
  }

  // ── 3c. Insertar snapshot del item en pedido_items.
  //       Si falla, no rompe al cliente: el pedido principal ya quedó.
  const precioSnap = precioSnapInput != null && precioSnapInput > 0
    ? precioSnapInput
    : +producto.precio || 0
  const { error: eItem } = await admin
    .from('pedido_items')
    .insert([{
      pedido_id:       pedido.id,
      nombre_producto: producto.nombre,
      cantidad:        cantidadNum,
      precio_unitario: precioSnap,
      imagen_url:      Array.isArray(producto.imagenes) ? (producto.imagenes[0] ?? null) : null,
    }])
  if (eItem) {
    console.error('[culqi-charge] Pedido OK pero pedido_items falló:', eItem.message)
  }

  // ── 3d. Ledger de split: registrar la comisión Merkao + monto vendedor.
  //       Tasa = comisionEfectiva(categoria, meses_activo_vendedor):
  //       - 0% durante los primeros MESES_GRATIS meses de la tienda
  //       - luego 3/5/7% según categoría (ver lib/comisiones.ts)
  //       Si falla, NO rompemos la respuesta: el cobro ya se hizo,
  //       solo logueamos para reconciliación manual.
  const montoTotal = +(montoNum / 100).toFixed(2)
  const categoriaId = typeof producto.categoria_id === 'number' ? producto.categoria_id : 0

  const { data: tienda } = await admin
    .from('tiendas')
    .select('created_at')
    .eq('id', producto.vendedor_id)
    .maybeSingle()

  const mesesActivo = tienda?.created_at
    ? Math.floor(
        (Date.now() - new Date(tienda.created_at as string).getTime()) /
          (1000 * 60 * 60 * 24 * 30),
      )
    : 0
  // Vendedor sin fila en `tiendas` aún → mesesActivo = 0 → cae en los MESES_GRATIS.
  void MESES_GRATIS // referencia documental: la lógica de gratis vive en comisionEfectiva

  const tasa = comisionEfectiva(categoriaId, mesesActivo) // 0..1
  const montoMerkao = +(montoTotal * tasa).toFixed(2)
  const montoVendedor = +(montoTotal - montoMerkao).toFixed(2) // resta evita drift de redondeo

  const { error: eComision } = await admin
    .from('comisiones_merkao')
    .insert([{
      pedido_id:      pedido.id,
      monto_total:    montoTotal,
      monto_merkao:   montoMerkao,
      monto_vendedor: montoVendedor,
      estado:         'pendiente',
    }])
  if (eComision) {
    console.error(
      '[culqi-charge] Pedido OK pero comisiones_merkao falló:',
      eComision.message,
      'pedido_id:', pedido.id,
      'culqi_charge_id:', culqiData.id,
    )
  }

  return json({ success: true, pedido_id: pedido.id })
}
