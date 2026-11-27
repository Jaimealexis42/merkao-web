// Días hábiles en Perú: lunes a viernes sin feriados nacionales
// (D. Leg. 713, art. 6, y leyes que agregaron fechas; lista en gob.pe/feriados).
// No descuenta los "días no laborables" del sector público: así el vencimiento
// calculado nunca queda más tarde que el real.
// Las fechas son cadenas AAAA-MM-DD del calendario de Lima.

export const PLAZO_RECLAMO_DIAS_HABILES = 15

const FERIADOS_FIJOS = [
  '01-01', '05-01', '06-07', '06-29', '07-23', '07-28', '07-29',
  '08-06', '08-30', '10-08', '11-01', '12-08', '12-09', '12-25',
]

const aUtc = (fecha: string) => new Date(fecha + 'T00:00:00Z')
const aTexto = (d: Date) => d.toISOString().slice(0, 10)
const sumarDias = (fecha: string, n: number) => {
  const d = aUtc(fecha)
  d.setUTCDate(d.getUTCDate() + n)
  return aTexto(d)
}

/** Domingo de Pascua (algoritmo gregoriano anónimo). */
function pascua(anio: number): string {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return aTexto(new Date(Date.UTC(anio, mes - 1, dia)))
}

export function esHabil(fecha: string): boolean {
  const diaSemana = aUtc(fecha).getUTCDay()
  if (diaSemana === 0 || diaSemana === 6) return false
  if (FERIADOS_FIJOS.includes(fecha.slice(5))) return false
  const domingo = pascua(Number(fecha.slice(0, 4)))
  // Jueves y Viernes Santo.
  return fecha !== sumarDias(domingo, -3) && fecha !== sumarDias(domingo, -2)
}

/** Último día para responder: el día hábil número `dias` después de `desde`. */
export function vencimiento(desde: string, dias = PLAZO_RECLAMO_DIAS_HABILES): string {
  let fecha = desde
  for (let contados = 0; contados < dias; ) {
    fecha = sumarDias(fecha, 1)
    if (esHabil(fecha)) contados++
  }
  return fecha
}

/**
 * Días hábiles que quedan después de `hoy` hasta `vence` (inclusive).
 * Negativo: días hábiles transcurridos desde que venció.
 */
export function diasHabilesRestantes(hoy: string, vence: string): number {
  const vencido = hoy > vence
  const [ini, fin] = vencido ? [vence, hoy] : [hoy, vence]
  let n = 0
  for (let f = sumarDias(ini, 1); f <= fin; f = sumarDias(f, 1)) if (esHabil(f)) n++
  // Vencido en fin de semana o feriado: ya cuenta como vencido.
  return vencido ? -Math.max(n, 1) : n
}

/** Fecha (AAAA-MM-DD) en Lima de un instante. */
export function fechaLima(instante: Date | string = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(instante))
}
