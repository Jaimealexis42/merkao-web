/**
 * Comisiones por categoría en Merkao.
 * Los primeros 3 meses son siempre 0 %.
 */

export const MESES_GRATIS = 3

/** Tasa de comisión por categoria_id (0–1). */
export const COMISIONES: Record<number, number> = {
  1: 0.05, // Ropa y Moda
  2: 0.07, // Electrónicos
  3: 0.03, // Alimentos
  4: 0.03, // Artesanías
  5: 0.05, // Hogar
  6: 0.07, // Autos y Motos
  7: 0.03, // Agrícola
  8: 0.05, // Otros
}

/** Tasa por nombre de categoría (para páginas que solo tienen el string). */
const COMISIONES_POR_NOMBRE: Record<string, number> = {
  'Ropa y Moda':   0.05,
  'Electrónicos':  0.07,
  'Alimentos':     0.03,
  'Artesanías':    0.03,
  'Hogar':         0.05,
  'Autos y Motos': 0.07,
  'Agrícola':      0.03,
  'Otros':         0.05,
}

/** Porcentaje entero por categoria_id. Devuelve 5 si el id no está registrado. */
export function getPct(categoriaId: number): number {
  return Math.round((COMISIONES[categoriaId] ?? 0.05) * 100)
}

/** Porcentaje entero por nombre de categoría. Devuelve null si no se reconoce. */
export function getPctPorNombre(categoria: string): number | null {
  const tasa = COMISIONES_POR_NOMBRE[categoria]
  return tasa !== undefined ? Math.round(tasa * 100) : null
}

/**
 * Comisión efectiva según meses desde el registro del vendedor.
 * Devuelve 0 durante los primeros MESES_GRATIS meses.
 */
export function comisionEfectiva(categoriaId: number, mesesActivo: number): number {
  if (mesesActivo < MESES_GRATIS) return 0
  return COMISIONES[categoriaId] ?? 0.05
}

/** Resumen legible: "3 %" o "Gratis (primeros 3 meses)". */
export function labelComision(pct: number, esGratis = false): string {
  if (esGratis) return `0 % (primeros ${MESES_GRATIS} meses gratis)`
  return `${pct} %`
}

/** Tabla pública de comisiones para mostrar en UI. */
export const TABLA_COMISIONES: { nombre: string; pct: number; icono: string }[] = [
  { nombre: 'Alimentos',      pct: 3, icono: '🥗' },
  { nombre: 'Artesanías',     pct: 3, icono: '🎨' },
  { nombre: 'Agrícola',       pct: 3, icono: '🌾' },
  { nombre: 'Ropa y Moda',    pct: 5, icono: '👗' },
  { nombre: 'Hogar',          pct: 5, icono: '🛋️' },
  { nombre: 'Otros',          pct: 5, icono: '📦' },
  { nombre: 'Electrónicos',   pct: 7, icono: '📱' },
  { nombre: 'Autos y Motos',  pct: 7, icono: '🚗' },
]
