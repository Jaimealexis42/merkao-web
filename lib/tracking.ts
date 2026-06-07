// lib/tracking.ts — Helpers compartidos para tracking de pedidos.

export type EstadoTracking = 'preparando' | 'enviado' | 'en_camino' | 'entregado'

export const ESTADOS: EstadoTracking[] = ['preparando', 'enviado', 'en_camino', 'entregado']

export const ESTADO_META: Record<EstadoTracking, {
  label: string
  icono: string
  desc: string
  badge: string
}> = {
  preparando: {
    label: 'Preparando',
    icono: '📋',
    desc: 'El vendedor está preparando tu pedido.',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  enviado: {
    label: 'Enviado',
    icono: '📦',
    desc: 'El paquete fue despachado al courier.',
    badge: 'bg-blue-100 text-blue-700',
  },
  en_camino: {
    label: 'En camino',
    icono: '🚚',
    desc: 'El paquete está en tránsito hacia tu dirección.',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  entregado: {
    label: 'Entregado',
    icono: '✅',
    desc: 'El paquete fue entregado en destino.',
    badge: 'bg-green-100 text-green-700',
  },
}

export interface TrackingEvento {
  id: string
  pedido_id: string
  tracking_code: string
  estado: EstadoTracking
  notas: string | null
  created_at: string
  updated_at: string
}

// ── WhatsApp helpers ───────────────────────────────────────
// Estrategia: wa.me link. El vendedor hace click y se abre WhatsApp
// (web o app) con el mensaje pre-escrito. NO usa Meta Business API
// (que requiere número aprobado + templates + verificación).
//
// Para enviar automáticamente sin click del vendedor habría que
// integrar la WhatsApp Cloud API de Meta — recomendable para escala
// pero requiere setup separado: cuenta Business verificada, templates
// aprobados, webhook, y env var WHATSAPP_BUSINESS_TOKEN.

/**
 * Normaliza un teléfono a formato E.164 sin '+' (formato que acepta wa.me).
 * Si no detecta código de país, asume Perú (51).
 */
export function normalizarTelefonoPeru(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  // Mantiene solo dígitos
  let digits = telefono.replace(/\D+/g, '')
  if (digits.length === 0) return null
  // Si empieza con '51' y tiene 11 dígitos (51 + 9 móvil), ya está OK
  if (digits.startsWith('51') && digits.length === 11) return digits
  // Si tiene 9 dígitos y empieza con 9, es móvil peruano sin prefijo
  if (digits.length === 9 && digits.startsWith('9')) return '51' + digits
  // Si ya tiene más de 11 dígitos asumimos código de país explícito
  if (digits.length >= 11) return digits
  return null
}

/**
 * Construye el mensaje WhatsApp para el comprador cuando cambia el estado.
 * Tono natural peruano, max ~280 chars (cabe en preview de WhatsApp).
 */
export function mensajeWhatsApp(args: {
  nombreComprador: string
  estado: EstadoTracking
  trackingCode: string
  notas?: string | null
  origen?: string // p.ej "https://merkao.pe"
}): string {
  const { nombreComprador, estado, trackingCode, notas, origen = 'https://merkao.pe' } = args
  const meta = ESTADO_META[estado]
  const saludo = `Hola ${nombreComprador.split(' ')[0] || ''}`.trim()
  const linkTracking = `${origen}/tracking/${trackingCode}`
  const lineas: string[] = [
    `${saludo}, te escribo desde Merkao.pe 🇵🇪`,
    `Actualización de tu pedido: ${meta.icono} ${meta.label}.`,
    `${meta.desc}`,
  ]
  if (notas && notas.trim()) lineas.push(`Nota: ${notas.trim()}`)
  lineas.push(`Seguí tu pedido acá: ${linkTracking}`)
  return lineas.join('\n')
}

/**
 * Genera el link wa.me con el mensaje pre-cargado. Devuelve null si el
 * teléfono no se puede normalizar (no hay link válido).
 */
export function whatsappLink(args: {
  telefono: string | null | undefined
  mensaje: string
}): string | null {
  const tel = normalizarTelefonoPeru(args.telefono)
  if (!tel) return null
  return `https://wa.me/${tel}?text=${encodeURIComponent(args.mensaje)}`
}
