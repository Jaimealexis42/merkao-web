// Templates de email para el flujo de confirmación de entrega (escrow).

const MERKAO_COLOR = '#16a34a'

export function escrowConfirmacionHtml(opts: {
  nombreComprador: string
  nombreProducto: string
  total: string
  pedidoId: string
  urlOk: string
  urlProblema: string
}): string {
  const { nombreComprador, nombreProducto, total, pedidoId, urlOk, urlProblema } = opts
  const nombre = nombreComprador || 'Comprador'
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:95vw">

      <!-- Header -->
      <tr><td style="background:${MERKAO_COLOR};padding:24px 32px;text-align:center">
        <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">Merkao</span>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:32px 32px 8px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111">Hola ${nombre},</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.5">
          Tu pago por <strong>${nombreProducto}</strong> (${total}) está siendo procesado. El dinero queda retenido hasta que confirmes que recibiste tu pedido.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.5">
          Cuando llegue, toca el botón que corresponda:
        </p>

        <!-- Botón OK -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px">
          <tr><td align="center">
            <a href="${urlOk}" style="display:inline-block;background:${MERKAO_COLOR};color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.2px">
              ✓ Recibí mi pedido
            </a>
          </td></tr>
        </table>
        <p style="text-align:center;font-size:12.5px;color:#888;margin:0 0 4px">Al tocarlo, liberamos el pago al vendedor.</p>

        <div style="border-top:1px solid #e5e7eb;margin:24px 0"></div>

        <!-- Botón problema -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
          <tr><td align="center">
            <a href="${urlProblema}" style="display:inline-block;background:#fff;color:#dc2626;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;border:1.5px solid #fca5a5">
              ✗ Tengo un problema
            </a>
          </td></tr>
        </table>
        <p style="text-align:center;font-size:12.5px;color:#888;margin:0 0 24px">Frenamos el pago y te contactamos.</p>

        <!-- Nota automática -->
        <div style="background:#f9fafb;border-radius:8px;padding:14px 16px;margin-bottom:24px">
          <p style="margin:0;font-size:13px;color:#555;line-height:1.5">
            <strong>¿No haces nada?</strong> Si en 7 días desde que el vendedor registre la entrega no reportas ningún problema, el pago se libera automáticamente.
          </p>
        </div>

        <p style="font-size:12px;color:#aaa;margin:0 0 4px">
          Número de pedido: <span style="font-family:monospace">${pedidoId}</span>
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0">
        <p style="margin:0;font-size:12px;color:#aaa;text-align:center">
          Merkao — Compra y vende con total seguridad en el Perú.<br>
          Si no reconoces este pedido, ignora este correo.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function escrowConfirmacionText(opts: {
  nombreComprador: string
  nombreProducto: string
  total: string
  pedidoId: string
  urlOk: string
  urlProblema: string
}): string {
  const { nombreComprador, nombreProducto, total, pedidoId, urlOk, urlProblema } = opts
  return `Hola ${nombreComprador || 'Comprador'},

Tu pago por "${nombreProducto}" (${total}) está retenido en Merkao.

Cuando recibas tu pedido:

RECIBÍ MI PEDIDO (libera el pago al vendedor):
${urlOk}

TENGO UN PROBLEMA (frena el pago):
${urlProblema}

¿No haces nada? Si en 7 días desde la entrega no reportas nada, el pago se libera automáticamente.

Pedido: ${pedidoId}
Merkao — merkao.org`
}

export function escrowProblemaAdminHtml(opts: {
  pedidoId: string
  emailComprador: string
  nombreComprador: string
  nombreProducto: string
  total: string
}): string {
  const { pedidoId, emailComprador, nombreComprador, nombreProducto, total } = opts
  return `<!DOCTYPE html><html lang="es"><body style="font-family:sans-serif;padding:24px;color:#111">
<h2 style="color:#dc2626">⚠️ Problema reportado en pedido</h2>
<table style="border-collapse:collapse;width:100%;max-width:480px">
  <tr><td style="padding:6px 12px 6px 0;color:#555;width:140px"><b>Pedido</b></td><td style="font-family:monospace">${pedidoId}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#555"><b>Comprador</b></td><td>${nombreComprador}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#555"><b>Email</b></td><td>${emailComprador}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#555"><b>Producto</b></td><td>${nombreProducto}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#555"><b>Total</b></td><td>${total}</td></tr>
</table>
<p style="margin-top:20px;color:#555">El pago ha sido <strong>frenado</strong>. Contáctate con el comprador para resolver.</p>
</body></html>`
}
