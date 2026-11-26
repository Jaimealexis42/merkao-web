// Ejecutar: node --test lib/precios.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularPrecios } from './precios.ts'

const montos = (precio, pais) => {
  const { subtotal, igv, base, tarifaServicio, arancel, total } = calcularPrecios(precio, pais)
  return { subtotal, igv, base, tarifaServicio, arancel, total }
}

test('el precio publicado ya incluye el IGV: no se suma encima (alfombra de S/ 67)', () => {
  assert.deepEqual(montos(67), { subtotal: 67, igv: 10.22, base: 56.78, tarifaServicio: 2.01, arancel: 0, total: 69.01 })
})

test('producto de S/ 270', () => {
  assert.deepEqual(montos(270), { subtotal: 270, igv: 41.19, base: 228.81, tarifaServicio: 8.1, arancel: 0, total: 278.1 })
})

test('el arancel se calcula sobre el precio publicado', () => {
  assert.deepEqual(montos(67, 'CL'), { subtotal: 67, igv: 10.22, base: 56.78, tarifaServicio: 2.01, arancel: 4.02, total: 73.03 })
})
