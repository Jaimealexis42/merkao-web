// lib/precios.ts — Cálculo de IGV, aranceles por país y tarifa de servicio Merkao

export const IGV_TASA = 0.18
export const TARIFA_SERVICIO = 0.03 // Merkao cobra 3% al comprador (vendedor recibe 100%)

export const ARANCELES: Record<string, { pais: string; bandera: string; tasa: number }> = {
  CO: { pais: 'Colombia', bandera: '🇨🇴', tasa: 0.15 },
  CL: { pais: 'Chile',    bandera: '🇨🇱', tasa: 0.06 },
  BO: { pais: 'Bolivia',  bandera: '🇧🇴', tasa: 0.10 },
  EC: { pais: 'Ecuador',  bandera: '🇪🇨', tasa: 0.15 },
  BR: { pais: 'Brasil',   bandera: '🇧🇷', tasa: 0.20 },
  US: { pais: 'EE.UU.',   bandera: '🇺🇸', tasa: 0.25 },
}

export type Precios = {
  base: number           // precio sin IGV
  igv: number            // monto IGV 18%
  subtotal: number       // base + igv
  arancel: number        // monto arancel del país comprador
  tarifaServicio: number // 3% de tarifa de servicio Merkao (al comprador)
  total: number          // subtotal + arancel + tarifaServicio
  tasaArancel: number    // tasa del arancel (0 si no aplica)
  paisInfo: { pais: string; bandera: string; tasa: number } | null
}

export function calcularPrecios(precioBase: number, codigoPais = 'PE'): Precios {
  const base           = precioBase
  const igv            = +( base * IGV_TASA ).toFixed(2)
  const subtotal       = +( base + igv ).toFixed(2)
  const paisInfo       = ARANCELES[codigoPais] ?? null
  const tasaArancel    = paisInfo?.tasa ?? 0
  const arancel        = +( subtotal * tasaArancel ).toFixed(2)
  const tarifaServicio = +( subtotal * TARIFA_SERVICIO ).toFixed(2)
  const total          = +( subtotal + arancel + tarifaServicio ).toFixed(2)
  return { base, igv, subtotal, arancel, tarifaServicio, total, tasaArancel, paisInfo }
}

export function fmt(n: number): string {
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
