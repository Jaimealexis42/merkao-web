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
    producto_id,
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

  // ── 3. Insertar pedido en Supabase ────────────────────────────────
  const { data: pedido, error: sbError } = await supabase
    .from('pedidos')
    .insert([{
      producto_id,
      nombre_comprador: nombre_comprador ?? '',
      email_comprador:  email,
      telefono:         telefono ?? null,
      direccion:        direccion ?? null,
      notas:            notas ?? null,
      pais_comprador:   pais_comprador ?? 'PE',
      monto_base:       +(monto / 100 / 1.18).toFixed(2),
      monto_igv:        +(igv ?? 0),
      monto_arancel:    +(arancel ?? 0),
      monto_total:      +(monto / 100).toFixed(2),
      metodo_pago:      metodo_pago ?? 'tarjeta',
      estado:           'pagado',
      escrow_liberado:  false,
      culqi_charge_id:  culqiData.id as string,
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

  return NextResponse.json({ success: true, pedido_id: pedido.id })
}
