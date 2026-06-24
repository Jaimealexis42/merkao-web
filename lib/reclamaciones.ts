// Datos del proveedor (Merkao) y helpers de formateo para el Libro de
// Reclamaciones. Centralizado acá para que página y email lean la misma fuente.

export const PROVEEDOR = {
  titular: 'ARANA PAREDES JAIME ALEXIS',
  nombreComercial: 'Merkao',
  ruc: '10414179709',
  emailContacto: 'merkao.org@gmail.com',
  domicilio: 'Jr. Puno C-8, Puerto Maldonado, Madre de Dios',
} as const

export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE'
export type TipoBien = 'PRODUCTO' | 'SERVICIO'
export type TipoReclamo = 'RECLAMO' | 'QUEJA'

export type ReclamacionPayload = {
  codigo: string
  fechaReclamo: string // ISO
  consumidor: {
    nombre: string
    documentoTipo: TipoDocumento
    documentoNum: string
    domicilio: string
    telefono: string
    email: string
    esMenor: boolean
    apoderadoNombre?: string
    apoderadoDocumento?: string
  }
  bien: {
    tipo: TipoBien
    monto: number
    descripcion: string
  }
  reclamo: {
    tipo: TipoReclamo
    detalle: string
    pedido: string
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtFecha(iso: string): string {
  const d = new Date(iso)
  // Lima
  return d.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

export function constanciaSubject(codigo: string): string {
  return `Constancia de reclamo ${codigo} — Libro de Reclamaciones Merkao`
}

export function constanciaHtml(p: ReclamacionPayload): string {
  const c = p.consumidor
  const b = p.bien
  const r = p.reclamo

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#f6f6f6;margin:0;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
<h2 style="margin:0 0 8px 0;color:#111;">Constancia de recepción de reclamo</h2>
<p style="margin:0 0 16px 0;color:#444;">Conforme a la Ley 29571 — Código de Protección y Defensa del Consumidor.</p>

<div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
  <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Código de registro</div>
  <div style="font-size:20px;font-weight:700;color:#111;">${esc(p.codigo)}</div>
  <div style="font-size:12px;color:#666;margin-top:4px;">Fecha: ${esc(fmtFecha(p.fechaReclamo))}</div>
</div>

<h3 style="margin:16px 0 8px 0;font-size:14px;color:#111;">Proveedor</h3>
<table style="width:100%;font-size:13px;color:#222;border-collapse:collapse;">
  <tr><td style="padding:4px 0;color:#666;width:140px;">Titular</td><td>${esc(PROVEEDOR.titular)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Nombre comercial</td><td>${esc(PROVEEDOR.nombreComercial)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">RUC</td><td>${esc(PROVEEDOR.ruc)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Email</td><td>${esc(PROVEEDOR.emailContacto)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Domicilio</td><td>${esc(PROVEEDOR.domicilio)}</td></tr>
</table>

<h3 style="margin:20px 0 8px 0;font-size:14px;color:#111;">Consumidor</h3>
<table style="width:100%;font-size:13px;color:#222;border-collapse:collapse;">
  <tr><td style="padding:4px 0;color:#666;width:140px;">Nombre</td><td>${esc(c.nombre)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Documento</td><td>${esc(c.documentoTipo)} ${esc(c.documentoNum)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Domicilio</td><td>${esc(c.domicilio)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Teléfono</td><td>${esc(c.telefono)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Email</td><td>${esc(c.email)}</td></tr>
  ${c.esMenor ? `
  <tr><td style="padding:4px 0;color:#666;">Apoderado</td><td>${esc(c.apoderadoNombre ?? '')} (${esc(c.apoderadoDocumento ?? '')})</td></tr>` : ''}
</table>

<h3 style="margin:20px 0 8px 0;font-size:14px;color:#111;">Bien contratado</h3>
<table style="width:100%;font-size:13px;color:#222;border-collapse:collapse;">
  <tr><td style="padding:4px 0;color:#666;width:140px;">Tipo</td><td>${esc(b.tipo)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Monto reclamado</td><td>S/ ${b.monto.toFixed(2)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;vertical-align:top;">Descripción</td><td>${esc(b.descripcion)}</td></tr>
</table>

<h3 style="margin:20px 0 8px 0;font-size:14px;color:#111;">Detalle del ${r.tipo === 'RECLAMO' ? 'reclamo' : 'queja'}</h3>
<div style="font-size:13px;color:#222;white-space:pre-wrap;background:#fafafa;border:1px solid #eee;border-radius:6px;padding:10px;">${esc(r.detalle)}</div>

<h3 style="margin:20px 0 8px 0;font-size:14px;color:#111;">Pedido del consumidor</h3>
<div style="font-size:13px;color:#222;white-space:pre-wrap;background:#fafafa;border:1px solid #eee;border-radius:6px;padding:10px;">${esc(r.pedido)}</div>

<p style="margin:24px 0 0 0;font-size:12px;color:#666;line-height:1.5;">
El proveedor cuenta con un plazo no mayor a 15 días hábiles improrrogables para
atender el reclamo. Recibirás la respuesta al correo registrado.
</p>
<p style="margin:8px 0 0 0;font-size:12px;color:#666;">
Conserva este código <strong>${esc(p.codigo)}</strong> como constancia.
</p>
</div>
</body></html>`
}

export function constanciaText(p: ReclamacionPayload): string {
  const c = p.consumidor
  const b = p.bien
  const r = p.reclamo
  return [
    'CONSTANCIA DE RECEPCIÓN DE RECLAMO',
    `Código: ${p.codigo}`,
    `Fecha: ${fmtFecha(p.fechaReclamo)}`,
    '',
    'PROVEEDOR',
    `Titular: ${PROVEEDOR.titular}`,
    `Nombre comercial: ${PROVEEDOR.nombreComercial}`,
    `RUC: ${PROVEEDOR.ruc}`,
    `Email: ${PROVEEDOR.emailContacto}`,
    `Domicilio: ${PROVEEDOR.domicilio}`,
    '',
    'CONSUMIDOR',
    `Nombre: ${c.nombre}`,
    `Documento: ${c.documentoTipo} ${c.documentoNum}`,
    `Domicilio: ${c.domicilio}`,
    `Teléfono: ${c.telefono}`,
    `Email: ${c.email}`,
    c.esMenor ? `Apoderado: ${c.apoderadoNombre ?? ''} (${c.apoderadoDocumento ?? ''})` : '',
    '',
    'BIEN CONTRATADO',
    `Tipo: ${b.tipo}`,
    `Monto: S/ ${b.monto.toFixed(2)}`,
    `Descripción: ${b.descripcion}`,
    '',
    `DETALLE DEL ${r.tipo}`,
    r.detalle,
    '',
    'PEDIDO DEL CONSUMIDOR',
    r.pedido,
    '',
    'Plazo de respuesta: 15 días hábiles improrrogables (Ley 29571).',
  ].filter(Boolean).join('\n')
}
