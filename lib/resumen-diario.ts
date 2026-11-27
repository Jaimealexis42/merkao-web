// Texto del resumen diario. Función pura: recibe los datos ya consultados.
// Un campo en null significa "no se pudo revisar" (nunca se toma como cero).

export type ReclamoPendiente = {
  codigo: string
  tipo: string
  fecha: string // AAAA-MM-DD
  vence: string // AAAA-MM-DD
  restantes: number // días hábiles; negativo = vencido
}

export type DatosResumen = {
  hoy: string // AAAA-MM-DD
  reclamos: ReclamoPendiente[] | null
  nuevos: { vendedores: string[]; productos: number } | null
  pedidos: { nuevos: number; enCurso: Record<string, number> } | null
  soporte: { nombre: string; desde: string }[] | null
  publicaciones: { ok: boolean; texto: string }
}

const ddmm = (f: string) => f.slice(8, 10) + '/' + f.slice(5, 7)
const plural = (n: number, uno: string, varios: string) => n + ' ' + (n === 1 ? uno : varios)

const ESTADOS: [string, string, string][] = [
  ['pendiente_pago', 'por pagar', 'por pagar'],
  ['pagado', 'pagado', 'pagados'],
  ['enviado', 'enviado', 'enviados'],
  ['entregado', 'entregado', 'entregados'],
  ['disputado', 'en disputa', 'en disputa'],
]

function lineaReclamo(r: ReclamoPendiente): string {
  const base = '• ' + r.codigo + ' (' + r.tipo.toLowerCase() + ', ' + ddmm(r.fecha) + '): '
  if (r.restantes < 0) {
    return base + 'VENCIDO el ' + ddmm(r.vence) + ' (hace ' + plural(-r.restantes, 'día hábil', 'días hábiles') + ')'
  }
  if (r.restantes === 0) return base + 'vence HOY'
  const quedan = r.restantes === 1 ? 'queda 1 día hábil' : 'quedan ' + r.restantes + ' días hábiles'
  return base + quedan + ', vence el ' + ddmm(r.vence)
}

function sinNada(d: DatosResumen): boolean {
  return (
    d.reclamos?.length === 0 &&
    d.nuevos?.vendedores.length === 0 && d.nuevos.productos === 0 &&
    d.pedidos?.nuevos === 0 && Object.values(d.pedidos.enCurso).every((n) => n === 0) &&
    d.soporte?.length === 0 &&
    d.publicaciones.ok
  )
}

export function resumenDiario(d: DatosResumen): { subject: string; text: string } {
  if (sinNada(d)) {
    return {
      subject: 'Merkao, ' + ddmm(d.hoy) + ': sin novedades',
      text: 'Sin novedades ni pendientes desde ayer.',
    }
  }

  const bloques: string[] = []
  const error = (que: string) => que + ': no se pudo revisar.'

  if (d.reclamos === null) bloques.push(error('Reclamos'))
  else if (d.reclamos.length) bloques.push(['Reclamos pendientes', ...d.reclamos.map(lineaReclamo)].join('\n'))
  else bloques.push('Reclamos pendientes: ninguno')

  if (d.nuevos === null) bloques.push(error('Vendedores y productos nuevos'))
  else {
    const v = d.nuevos.vendedores
    bloques.push([
      'Nuevo desde ayer',
      '• Vendedores: ' + v.length + (v.length ? ' (' + v.join(', ') + ')' : ''),
      '• Productos: ' + d.nuevos.productos,
    ].join('\n'))
  }

  if (d.pedidos === null) bloques.push(error('Pedidos'))
  else {
    const { enCurso, nuevos } = d.pedidos
    const estados = ESTADOS.map(([estado, uno, varios]) => plural(enCurso[estado] ?? 0, uno, varios))
    bloques.push(['Pedidos', '• Nuevos: ' + nuevos, '• En curso: ' + estados.join(', ')].join('\n'))
  }

  if (d.soporte === null) bloques.push(error('Soporte'))
  else {
    const quienes = d.soporte.map((m) => m.nombre + ', desde el ' + ddmm(m.desde)).join('; ')
    bloques.push('Soporte sin responder: ' + d.soporte.length + (quienes ? ' (' + quienes + ')' : ''))
  }

  bloques.push('Publicaciones (última corrida): ' + d.publicaciones.texto)

  const vencidos = d.reclamos?.filter((r) => r.restantes < 0).length ?? 0
  const porVencer = (d.reclamos?.length ?? 0) - vencidos
  const avisos = [
    vencidos ? plural(vencidos, 'reclamo vencido', 'reclamos vencidos') : '',
    porVencer ? plural(porVencer, 'reclamo por vencer', 'reclamos por vencer') : '',
  ].filter(Boolean)

  return {
    subject: 'Merkao, resumen del ' + ddmm(d.hoy) + (avisos.length ? ': ' + avisos.join(' y ') : ''),
    text: bloques.join('\n\n'),
  }
}
