import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ── Cliente admin (server-only) ─────────────────────────────────────
// Usa SUPABASE_SERVICE_ROLE_KEY para bypassear RLS y poder INSERT a
// pedidos/pedido_items DESPUÉS de que Culqi confirmó el cobro. La key
// NO lleva prefijo NEXT_PUBLIC_ por lo que Next no la inyecta al
// bundle del cliente — solo vive en el process server.
//
// Lazy init para que `next build` no rompa si la env no está presente
// en el entorno de build (Vercel sí la inyecta en runtime). Si falta
// en runtime, devolvemos 500 explícito con mensaje accionable.
let _admin: SupabaseClient | null = null
function getAdminClient(): SupabaseClient | null {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  _admin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
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
  // ── 0a. Guard: service-role key debe estar configurada ────────────
  const admin = getAdminClient()
  if (!admin) {
    console.error('[culqi-charge] SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL no configuradas')
    return NextResponse.json(
      { error: 'Servicio de pagos no disponible. Contacta soporte.' },
      { status: 500 },
    )
  }

  // ── 0b. Rate limit por IP (5 cobros/min) ──────────────────────────
  const ip = getClientIp(req)
  const rl = checkRateLimit(`culqi:${ip}`)
  if (!rl.ok) {
    return NextResponse.json(
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
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Token de pago inválido.' }, { status: 400 })
  }
  const montoNum = typeof monto === 'number' ? monto : Number(monto)
  if (!Number.isInteger(montoNum) || montoNum < MIN_MONTO_CENTIMOS || montoNum > MAX_MONTO_CENTIMOS) {
    return NextResponse.json(
      { error: `Monto fuera de rango (mín ${MIN_MONTO_CENTIMOS}, máx ${MAX_MONTO_CENTIMOS} céntimos).` },
      { status: 400 },
    )
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (typeof producto_id !== 'string' || !UUID_RE.test(producto_id)) {
    return NextResponse.json({ error: 'producto_id inválido (se espera UUID).' }, { status: 400 })
  }
  const cantidadNum = cantidad != null ? Number(cantidad) : 1
  if (!Number.isInteger(cantidadNum) || cantidadNum < 1 || cantidadNum > 1000) {
    return NextResponse.json({ error: 'Cantidad fuera de rango (1–1000).' }, { status: 400 })
  }
  const paisNorm = clipString(pais_comprador, 4) ?? 'PE'
  if (!/^[A-Z]{2,3}$/.test(paisNorm)) {
    return NextResponse.json({ error: 'pais_comprador inválido.' }, { status: 400 })
  }
  const metodoNorm = (clipString(metodo_pago, 24) ?? 'tarjeta').toLowerCase()
  if (!['yape', 'plin', 'tarjeta', 'efectivo', 'transferencia'].includes(metodoNorm)) {
    return NextResponse.json({ error: 'Método de pago inválido.' }, { status: 400 })
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
    return NextResponse.json(
      { error: 'No se pudo conectar con el proveedor de pagos.' },
      { status: 502 },
    )
  }

  if (!culqiResponse.ok || culqiData.object === 'error') {
    const mensaje =
      (culqiData.user_message as string) ??
      (culqiData.merchant_message as string) ??
      'El cobro fue rechazado.'
    return NextResponse.json({ error: mensaje }, { status: 402 })
  }

  // ── 3a. Lookup producto: necesitamos vendedor_id (pedidos.vendedor_id es
  //       columna real) + snapshot de nombre/imagen para pedido_items.
  //       Schema real de pedidos NO tiene producto_id — los items van en
  //       la tabla pedido_items.
  const { data: producto, error: eProducto } = await admin
    .from('productos')
    .select('id, nombre, vendedor_id, imagenes, precio')
    .eq('id', producto_id)
    .single()

  if (eProducto || !producto) {
    console.error('[culqi-charge] Producto no encontrado:', producto_id, eProducto?.message)
    return NextResponse.json(
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
    return NextResponse.json(
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

  return NextResponse.json({ success: true, pedido_id: pedido.id })
}
