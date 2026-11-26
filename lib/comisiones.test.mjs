// Ejecutar: node --test lib/comisiones.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repartirPago } from './comisiones.ts'
import { calcularPrecios } from './precios.ts'

/** Mismo cálculo que /api/culqi-charge: el envío se suma al total cobrado. */
function cobrar({ precio, tasa, envio = 0, pais = 'PE' }) {
  const p = calcularPrecios(precio, pais)
  const montoTotal = +(p.total + envio).toFixed(2)
  const reparto = repartirPago({ montoTotal, subtotalProducto: p.subtotal, tarifaServicio: p.tarifaServicio, tasa })
  return { montoTotal, ...reparto }
}

// Alfombra de S/ 67: 79.06 con IGV + 2.37 de tarifa = 81.43
test('vendedor nuevo: Merkao recibe solo la tarifa del comprador', () => {
  assert.deepEqual(cobrar({ precio: 67, tasa: 0 }), { montoTotal: 81.43, montoMerkao: 2.37, montoVendedor: 79.06 })
})

test('con comisión: se calcula sobre el producto con IGV, no sobre la tarifa', () => {
  // 79.06 * 5 % = 3.95; Merkao = 2.37 + 3.95
  assert.deepEqual(cobrar({ precio: 67, tasa: 0.05 }), { montoTotal: 81.43, montoMerkao: 6.32, montoVendedor: 75.11 })
})

test('con envío: no paga comisión y va completo al vendedor', () => {
  assert.deepEqual(cobrar({ precio: 67, tasa: 0.05, envio: 10 }), { montoTotal: 91.43, montoMerkao: 6.32, montoVendedor: 85.11 })
})

test('con arancel: no paga comisión y se sigue acreditando al vendedor', () => {
  const peru = cobrar({ precio: 67, tasa: 0.05 })
  const chile = cobrar({ precio: 67, tasa: 0.05, pais: 'CL' }) // arancel 6 % = 4.74
  assert.equal(chile.montoMerkao, peru.montoMerkao)
  assert.equal(chile.montoVendedor, +(peru.montoVendedor + 4.74).toFixed(2))
})

test('las dos partes suman siempre el total cobrado', () => {
  for (const precio of [1, 9.99, 67, 270, 1234.56]) {
    for (const tasa of [0, 0.03, 0.05, 0.07]) {
      const r = cobrar({ precio, tasa, envio: 7.5 })
      assert.equal(Math.round((r.montoMerkao + r.montoVendedor) * 100), Math.round(r.montoTotal * 100))
    }
  }
})
