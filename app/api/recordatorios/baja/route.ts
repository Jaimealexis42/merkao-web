import { NextRequest, NextResponse } from 'next/server'
import { verificarBaja } from '@/lib/baja-token'
import { supabaseAdmin } from '@/lib/servidor'

// Enlace "Dejar de recibir estos recordatorios".
// El GET no escribe: la página envía sola el formulario (POST). Así los filtros
// de correo que abren los enlaces para revisarlos no dan de baja a nadie.
// El POST también atiende la baja de un clic de Gmail (List-Unsubscribe-Post).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function pagina(titulo: string, cuerpo: string, status = 200): NextResponse {
  return new NextResponse(
    '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>' + titulo + ' — Merkao</title>' +
    '<body style="font-family:system-ui,sans-serif;max-width:440px;margin:15vh auto;padding:0 24px;text-align:center;color:#0b1220">' +
    '<h1 style="font-size:22px">' + titulo + '</h1>' + cuerpo + '</body></html>',
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )
}

function vendedorValido(req: NextRequest): string | null {
  const v = req.nextUrl.searchParams.get('v') ?? ''
  const t = req.nextUrl.searchParams.get('t') ?? ''
  return UUID_RE.test(v) && verificarBaja(v, t) ? v : null
}

const invalido = () => pagina('Enlace no válido', '<p>Abre el enlace completo desde tu correo.</p>', 400)

export async function GET(req: NextRequest) {
  if (!vendedorValido(req)) return invalido()
  // Sin "action": el formulario se envía a esta misma URL, con sus parámetros.
  return pagina(
    'Recordatorios de Merkao',
    '<form method="post" id="baja"><button style="padding:12px 20px;border:0;border-radius:10px;background:#F2700C;color:#fff;font-weight:700;cursor:pointer">Dejar de recibir estos recordatorios</button></form>' +
    '<script>document.getElementById("baja").submit()</script>',
  )
}

export async function POST(req: NextRequest) {
  const vendedorId = vendedorValido(req)
  if (!vendedorId) return invalido()
  const { error } = await supabaseAdmin()
    .from('recordatorios_vendedor')
    .upsert({ vendedor_id: vendedorId, baja_at: new Date().toISOString() }, { onConflict: 'vendedor_id' })
  if (error) {
    console.error('[baja] ' + error.message)
    return pagina('No se pudo registrar', '<p>Inténtalo otra vez en unos minutos.</p>', 500)
  }
  return pagina('Listo', '<p>Ya no recibirás estos recordatorios. Los correos sobre tus pedidos y mensajes de soporte siguen llegando.</p>')
}
