// Ejecutar: node --test lib/comisiones.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repartirPago } from './comisiones.ts'
import { calcularPrecios } from './precios.ts'

// Alfombra de S/ 67: 79.06 con IGV + 2.37 de tarifa = 81.43
const { total, tarifaServicio } = calcularPrecios(67)

test('en los meses gratis, la tarifa del comprador es de Merkao', () => {
  assert.deepEqual(repartirPago({ montoTotal: total, tarifaServicio, tasa: 0 }), {
    montoMerkao: 2.37,
    montoVendedor: 79.06,
  })
})

test('la comisión del vendedor no se calcula sobre la tarifa del comprador', () => {
  // 79.06 * 5 % = 3.95; Merkao = 2.37 + 3.95
  assert.deepEqual(repartirPago({ montoTotal: total, tarifaServicio, tasa: 0.05 }), {
    montoMerkao: 6.32,
    montoVendedor: 75.11,
  })
})

test('las dos partes suman siempre el total cobrado', () => {
  for (const precio of [1, 9.99, 67, 270, 1234.56]) {
    for (const tasa of [0, 0.03, 0.05, 0.07]) {
      const p = calcularPrecios(precio)
      const r = repartirPago({ montoTotal: p.total, tarifaServicio: p.tarifaServicio, tasa })
      assert.equal(Math.round((r.montoMerkao + r.montoVendedor) * 100), Math.round(p.total * 100))
    }
  }
})
