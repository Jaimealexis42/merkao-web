import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { textosDeTemporada } from './temporada.mjs'

const archivo = JSON.parse(readFileSync(new URL('../posts/variants.json', import.meta.url), 'utf8'))

test('hasta el 31 de diciembre inclusive usa los navideños', () => {
  for (const dia of ['2026-11-26', '2026-12-31']) {
    assert.equal(textosDeTemporada(archivo, dia).temporada, 'navidad', dia)
  }
})

test('desde el 1 de enero vuelve a los normales', () => {
  for (const dia of ['2027-01-01', '2027-12-24']) {
    assert.equal(textosDeTemporada(archivo, dia).temporada, 'normal', dia)
  }
})

test('hay 7 textos de cada tipo y todos explican las comisiones', () => {
  for (const lista of [archivo.variantes, archivo.navidad.variantes]) {
    assert.equal(lista.length, 7)
    for (const { texto } of lista) {
      assert.match(texto, /Vendedores: 0% de comisión los primeros 12 meses/)
      assert.match(texto, /Compradores: tarifa de servicio Merkao de 3%/)
    }
  }
})
