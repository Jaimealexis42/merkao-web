// Reglas y textos de los recordatorios a vendedores. Funciones puras.

export const DIAS_ENTRE_RECORDATORIOS = 7
export const DIAS_TIENDA_SIN_PRODUCTOS = 3
export const MIN_DESCRIPCION = 40

const DIA = 86_400_000
const SITIO = 'https://merkao.org'

export type Tienda = { id: string; nombre: string | null; created_at: string }
export type Producto = {
  vendedor_id: string | null
  nombre: string
  descripcion: string | null
  imagenes: string[] | null
  estado: string | null
}
export type Estado = { vendedor_id: string; ultimo_envio_at: string | null; baja_at: string | null }

export type Pendiente =
  | { vendedorId: string; tienda: string | null; tipo: 'sin_productos' }
  | { vendedorId: string; tienda: string | null; tipo: 'productos'; items: { nombre: string; problema: string }[] }

function problema(p: Producto): string | null {
  const sinFoto = !p.imagenes?.some((url) => url?.trim())
  const corta = (p.descripcion ?? '').trim().length < MIN_DESCRIPCION
  if (sinFoto && corta) return 'le falta foto y la descripción es muy corta'
  if (sinFoto) return 'le falta foto'
  if (corta) return 'la descripción es muy corta'
  return null
}

/** Como máximo un pendiente por vendedor, ya filtradas bajas y envíos recientes. */
export function pendientes(tiendas: Tienda[], productos: Producto[], estados: Estado[], ahora: Date): Pendiente[] {
  // Margen de 1 hora: el cron no arranca al mismo segundo cada día.
  const limite = ahora.getTime() - DIAS_ENTRE_RECORDATORIOS * DIA + 3_600_000
  const bloqueados = new Set(
    estados
      .filter((e) => e.baja_at || (e.ultimo_envio_at && Date.parse(e.ultimo_envio_at) > limite))
      .map((e) => e.vendedor_id),
  )
  const salida: Pendiente[] = []
  for (const t of tiendas) {
    if (bloqueados.has(t.id)) continue
    const suyos = productos.filter((p) => p.vendedor_id === t.id)
    if (suyos.length === 0) {
      if (ahora.getTime() - Date.parse(t.created_at) >= DIAS_TIENDA_SIN_PRODUCTOS * DIA) {
        salida.push({ vendedorId: t.id, tienda: t.nombre, tipo: 'sin_productos' })
      }
      continue
    }
    const items = suyos
      .filter((p) => p.estado === 'activo')
      .flatMap((p) => {
        const falla = problema(p)
        return falla ? [{ nombre: p.nombre, problema: falla }] : []
      })
    if (items.length) salida.push({ vendedorId: t.id, tienda: t.nombre, tipo: 'productos', items })
  }
  return salida
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function correoRecordatorio(p: Pendiente, urlBaja: string) {
  const saludo = p.tienda?.trim() ? 'Hola, ' + p.tienda.trim() + ':' : 'Hola:'
  const baja = 'Dejar de recibir estos recordatorios'
  const sinProductos = p.tipo === 'sin_productos'

  const subject = sinProductos ? 'Tu tienda en Merkao todavía no tiene productos' : 'Mejora tus productos en Merkao'
  const intro = sinProductos
    ? 'Creaste tu tienda en Merkao, pero todavía no tiene productos. Publica el primero para que los compradores puedan encontrarte. Necesitas una foto, un nombre, una descripción y el precio.'
    : 'Estos productos pueden mostrarse mejor:'
  const lista = p.tipo === 'productos' ? p.items.map((i) => i.nombre + ': ' + i.problema) : []
  const consejo = sinProductos
    ? ''
    : 'Una foto clara y una descripción con medidas, material, estado y qué incluye ayudan al comprador a decidirse.'
  const accion = sinProductos
    ? { texto: 'Publicar mi primer producto', url: SITIO + '/vendedor/publicar' }
    : { texto: 'Editar mis productos', url: SITIO + '/vendedor/mis-productos' }
  const ayuda = sinProductos ? 'Si necesitas ayuda, escríbenos desde ' + SITIO + '/vendedor/soporte' : ''

  const text = [
    saludo,
    intro,
    lista.map((l) => '• ' + l).join('\n'),
    consejo,
    accion.texto + ': ' + accion.url,
    ayuda,
    'Equipo Merkao',
    baja + ': ' + urlBaja,
  ].filter(Boolean).join('\n\n')

  const html = [
    '<p>' + esc(saludo) + '</p>',
    '<p>' + esc(intro) + '</p>',
    lista.length ? '<ul>' + lista.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '',
    consejo ? '<p>' + esc(consejo) + '</p>' : '',
    '<p><a href="' + accion.url + '">' + accion.texto + ' →</a></p>',
    ayuda ? '<p>' + esc(ayuda) + '</p>' : '',
    '<p>Equipo Merkao</p>',
    '<p style="font-size:12px;color:#6b7280"><a href="' + esc(urlBaja) + '" style="color:#6b7280">' + baja + '</a></p>',
  ].join('')

  return { subject, text, html }
}
