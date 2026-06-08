import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    token,
    monto,
    email,
    producto_id,        // se usa para lookup del producto → vendedor_id + snapshot
    cantidad,           // opcional, default 1
    precio_unitario,    // opcional, snapshot del precio en el momento de la compra
    nombre_comprador,
    telefono,
    direccion,
    notas,
    pais_comprador,
    igv,
    arancel,
    metodo_pago,
  } = body

  // ── 1. Validar campos mínimos ──────────────────────────────────────
  if (!token || !monto || !email || !producto_id) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: token, monto, email, producto_id.' },
      { status: 400 },
    )
  }

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
        amount:        monto,
        currency_code: 'PEN',
        email,
        source_id:     token,
        description:   `Merkao – pedido de ${nombre_comprador ?? email}`,
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
  const { data: producto, error: eProducto } = await supabase
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
  const { data: pedido, error: sbError } = await supabase
    .from('pedidos')
    .insert([{
      vendedor_id:       producto.vendedor_id,
      nombre_comprador:  nombre_comprador ?? '',
      email_comprador:   email,
      telefono:          telefono ?? null,
      direccion_entrega: direccion ?? null,
      notas:             notas ?? null,
      pais_comprador:    pais_comprador ?? 'PE',
      igv:               +(igv ?? 0),
      arancel:           +(arancel ?? 0),
      total:             +(monto / 100).toFixed(2),
      metodo_pago:       metodo_pago ?? 'tarjeta',
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
  const qty = Math.max(1, Number(cantidad) || 1)
  const precioSnap = precio_unitario != null
    ? +precio_unitario
    : +producto.precio || 0
  const { error: eItem } = await supabase
    .from('pedido_items')
    .insert([{
      pedido_id:       pedido.id,
      nombre_producto: producto.nombre,
      cantidad:        qty,
      precio_unitario: precioSnap,
      imagen_url:      Array.isArray(producto.imagenes) ? (producto.imagenes[0] ?? null) : null,
    }])
  if (eItem) {
    console.error('[culqi-charge] Pedido OK pero pedido_items falló:', eItem.message)
  }

  return NextResponse.json({ success: true, pedido_id: pedido.id })
}
