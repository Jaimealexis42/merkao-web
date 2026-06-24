// Datos compartidos para páginas legales (privacidad, términos, cookies).
// Mantener sincronizado con lib/reclamaciones.ts (PROVEEDOR).
//
// BORRADOR — requiere validación de abogado y registro del banco de datos
// personales ante la Autoridad Nacional de Protección de Datos Personales (ANPD).

import { PROVEEDOR } from '@/lib/reclamaciones'

export { PROVEEDOR }

// Fecha de "última actualización" de las páginas legales. Se renderiza en
// español-PE. Actualizar manualmente cuando se modifique alguno de los textos.
export const LEGAL_LAST_UPDATE_ISO = '2026-06-24'

export function formatLegalDate(iso: string = LEGAL_LAST_UPDATE_ISO): string {
  return new Date(iso + 'T12:00:00-05:00').toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
