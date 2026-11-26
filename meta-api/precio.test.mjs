import { test } from 'node:test'
import assert from 'node:assert/strict'
import { precioReel } from './precio.mjs'

test('muestra el total con la tarifa del 3 %, sin sumar IGV encima', () => {
  const p = precioReel({ precio: 67, costoEnvio: 0 })
  assert.equal(p.total, 'S/ 69.01')
  assert.equal(p.caption, '💰 S/ 69.01 (incluye IGV y tarifa de servicio de 3%) · envío aparte')
  assert.equal(p.voz, 'Precio total: 69 soles con 1 céntimo, más el envío. ')
})

test('si el producto tiene costo de envío fijo, lo indica', () => {
  const p = precioReel({ precio: 270, costoEnvio: 15 })
  assert.equal(p.total, 'S/ 278.10')
  assert.match(p.voz, /278 soles con 10 céntimos/)
  assert.ok(p.caption.endsWith('· envío S/ 15.00 aparte'))
})

test('un total exacto no menciona céntimos', () => {
  assert.equal(precioReel({ precio: 100 }).voz, 'Precio total: 103 soles, más el envío. ')
})

test('sin precio no inventa uno', () => {
  assert.equal(precioReel({ precio: null }), null)
})
