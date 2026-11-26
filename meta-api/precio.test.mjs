import { test } from 'node:test'
import assert from 'node:assert/strict'
import { precioReel } from './precio.mjs'

test('muestra el total con IGV y tarifa del 3 %, con el envío aparte', () => {
  const p = precioReel({ precio: 67, costoEnvio: 0 })
  assert.equal(p.total, 'S/ 81.43')
  assert.equal(p.caption, '💰 S/ 81.43 (incluye IGV y tarifa de servicio de 3%) · envío aparte')
  assert.equal(p.voz, 'Precio total: 81 soles con 43 céntimos, más el envío. ')
})

test('si el producto tiene costo de envío fijo, lo indica', () => {
  const p = precioReel({ precio: 270, costoEnvio: 15 })
  assert.equal(p.total, 'S/ 328.16')
  assert.match(p.caption, /· envío S\/ 15\.00 aparte$/)
})

test('un total exacto no menciona céntimos', () => {
  // 100 * 1.18 * 1.03 = 121.54
  assert.match(precioReel({ precio: 100 }).voz, /121 soles con 54 céntimos/)
  assert.doesNotMatch(precioReel({ precio: 0 }).voz, /céntimos/)
})

test('sin precio no inventa uno', () => {
  assert.equal(precioReel({ precio: null }), null)
})
