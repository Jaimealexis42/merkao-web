// lib/transportistas.ts — Catálogo de transportistas + deep links al tracking oficial.
//
// Por qué deep link en vez de polling de API:
//   - Olva NO tiene API REST pública documentada (tracking.olvaexpress.pe es SPA).
//   - Shalom tampoco. El vendedor sigue actualizando el estado a mano en Merkao.
//   - El comprador puede ir al tracking oficial del courier con un click.
//
// Cuando alguno publique API pública (o se contrate Track123/17TRACK), agregar
// la consulta en una nueva función `consultarTracking(t, numero)` y un cron
// que la corra cada hora.

export type Transportista = 'olva' | 'shalom' | 'motorizado' | 'manual'

export const TRANSPORTISTAS: Transportista[] = ['olva', 'shalom', 'motorizado', 'manual']

export const TRANSPORTISTA_META: Record<Transportista, {
  label: string
  icono: string
  tieneTrackingExterno: boolean
  descripcion: string
}> = {
  olva: {
    label: 'Olva Courier',
    icono: '📦',
    tieneTrackingExterno: true,
    descripcion: 'Servicio nacional de paquetería',
  },
  shalom: {
    label: 'Shalom',
    icono: '🚛',
    tieneTrackingExterno: true,
    descripcion: 'Envíos a todo el Perú',
  },
  motorizado: {
    label: 'Motorizado',
    icono: '🏍️',
    tieneTrackingExterno: false,
    descripcion: 'Delivery local en moto',
  },
  manual: {
    label: 'Manual',
    icono: '👤',
    tieneTrackingExterno: false,
    descripcion: 'Entrega coordinada directamente',
  },
}

/**
 * Devuelve la URL de tracking público del courier, o null si no aplica.
 * Olva: query param ?tracking= (válido en su SPA, abre el lookup).
 * Shalom: landing /seguimiento — el comprador pega el número.
 */
export function linkTrackingExterno(t: Transportista | null | undefined, numero: string | null | undefined): string | null {
  if (!t || !numero) return null
  const n = numero.trim()
  if (!n) return null
  switch (t) {
    case 'olva':
      return `https://tracking.olvaexpress.pe/?tracking=${encodeURIComponent(n)}`
    case 'shalom':
      return `https://shalom.com.pe/seguimiento/?numero=${encodeURIComponent(n)}`
    default:
      return null
  }
}

export function transportistaLabel(t: Transportista | string | null | undefined): string {
  if (!t) return TRANSPORTISTA_META.manual.label
  return TRANSPORTISTA_META[t as Transportista]?.label ?? String(t)
}

export function transportistaIcono(t: Transportista | string | null | undefined): string {
  if (!t) return TRANSPORTISTA_META.manual.icono
  return TRANSPORTISTA_META[t as Transportista]?.icono ?? '📦'
}
