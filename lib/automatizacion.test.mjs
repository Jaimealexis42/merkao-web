import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diasHabilesRestantes, esHabil, fechaLima, vencimiento } from './dias-habiles.ts'
import { resumenDiario } from './resumen-diario.ts'
import { correoRecordatorio, pendientes } from './recordatorios.ts'
import { interpretar } from './publicaciones.ts'

test('la queja del 16/11/2026 vence el 07/12', () => {
  assert.equal(vencimiento('2026-11-16'), '2026-12-07')
  assert.equal(diasHabilesRestantes('2026-11-27', '2026-12-07'), 6)
})

test('no cuenta fines de semana ni feriados, incluida Semana Santa', () => {
  for (const f of ['2026-04-02', '2026-04-03', '2027-03-25', '2027-03-26', '2026-07-23', '2026-12-09', '2026-11-28']) {
    assert.equal(esHabil(f), false, f)
  }
  assert.equal(esHabil('2026-04-06'), true)
})

test('vencido: negativo, y cero el mismo día', () => {
  assert.equal(diasHabilesRestantes('2026-12-07', '2026-12-07'), 0)
  assert.equal(diasHabilesRestantes('2026-12-10', '2026-12-07'), -1)
  assert.equal(diasHabilesRestantes('2026-11-28', '2026-11-27'), -1)
})

test('la fecha se toma en hora de Lima', () => {
  assert.equal(fechaLima('2026-11-17T03:00:00Z'), '2026-11-16')
})

const vacio = {
  hoy: '2026-11-28', reclamos: [], nuevos: { vendedores: [], productos: 0 },
  pedidos: { nuevos: 0, enCurso: {} }, soporte: [], publicaciones: { ok: true, texto: 'Facebook OK · Instagram OK' },
}

test('sin novedades: una sola línea', () => {
  assert.deepEqual(resumenDiario(vacio), {
    subject: 'Merkao, 28/11: sin novedades', text: 'Sin novedades ni pendientes desde ayer.',
  })
})

test('una sección que no se pudo revisar nunca sale como "sin novedades"', () => {
  assert.match(resumenDiario({ ...vacio, reclamos: null }).text, /Reclamos: no se pudo revisar/)
})

test('resumen con reclamo, pedidos y fallo de publicación', () => {
  const r = resumenDiario({
    ...vacio,
    reclamos: [{ codigo: 'MERKAO-2026-00003', tipo: 'QUEJA', fecha: '2026-11-16', vence: '2026-12-07', restantes: 6 }],
    pedidos: { nuevos: 0, enCurso: { pagado: 1 } },
    publicaciones: { ok: false, texto: 'Instagram FALLÓ' },
  })
  assert.equal(r.subject, 'Merkao, resumen del 28/11: 1 reclamo por vencer')
  assert.match(r.text, /quedan 6 días hábiles, vence el 07\/12/)
  assert.match(r.text, /1 pagado, 0 enviados/)
  assert.match(r.text, /Instagram FALLÓ/)
})

test('publicaciones: identifica la red que falló', () => {
  const r = interpretar([{ annotation_level: 'failure', title: 'Instagram (reel)', message: 'Session has expired' }], 'failure')
  assert.deepEqual(r, { ok: false, texto: 'Facebook OK · Instagram FALLÓ (token vencido o inválido)' })
  assert.equal(interpretar([], 'failure').ok, false)
  assert.equal(interpretar([], 'success').ok, true)
})

const ahora = new Date('2026-11-27T15:00:00Z')
const hace = (dias) => new Date(ahora - dias * 86400000).toISOString()
const tienda = (id, dias) => ({ id, nombre: 'Tienda ' + id, created_at: hace(dias) })
const producto = (v, extra) => ({ vendedor_id: v, nombre: 'Silla', descripcion: 'x'.repeat(40), imagenes: ['https://f/1.jpg'], estado: 'activo', ...extra })

test('tienda sin productos solo desde los 3 días', () => {
  const r = pendientes([tienda('a', 2), tienda('b', 3)], [], [], ahora)
  assert.deepEqual(r.map((p) => [p.vendedorId, p.tipo]), [['b', 'sin_productos']])
})

test('solo productos activos sin foto o con descripción corta', () => {
  const r = pendientes([tienda('a', 10)], [
    producto('a', {}), producto('a', { imagenes: [] }), producto('a', { descripcion: 'corta' }),
    producto('a', { imagenes: null, estado: 'pausado' }),
  ], [], ahora)
  assert.deepEqual(r[0].items.map((i) => i.problema), ['le falta foto', 'la descripción es muy corta'])
})

test('respeta la baja y el máximo de uno por semana', () => {
  const estados = [
    { vendedor_id: 'a', ultimo_envio_at: hace(6), baja_at: null },
    { vendedor_id: 'b', ultimo_envio_at: null, baja_at: hace(100) },
    { vendedor_id: 'c', ultimo_envio_at: hace(7), baja_at: null },
  ]
  const r = pendientes(['a', 'b', 'c'].map((id) => tienda(id, 30)), [], estados, ahora)
  assert.deepEqual(r.map((p) => p.vendedorId), ['c'])
})

test('el correo lleva el enlace de baja y escapa el texto del vendedor', () => {
  const c = correoRecordatorio(
    { vendedorId: 'a', tienda: '<b>x</b>', tipo: 'productos', items: [{ nombre: '<img>', problema: 'le falta foto' }] },
    'https://merkao.org/api/recordatorios/baja?v=a&t=1',
  )
  assert.match(c.html, /Dejar de recibir estos recordatorios<\/a>/)
  assert.doesNotMatch(c.html, /<img>|<b>x/)
})
