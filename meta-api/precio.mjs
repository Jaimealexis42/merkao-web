// Precio que paga el comprador, con la misma función que usa el checkout.
import { calcularPrecios } from '../lib/precios.ts'

export function precioReel({ precio, costoEnvio = 0 }) {
  if (precio == null) return null
  const { total } = calcularPrecios(precio)
  const [soles, centimos] = total.toFixed(2).split('.')
  // El envío nunca va incluido: es un monto fijo aparte o se acuerda con el vendedor.
  const envio = costoEnvio > 0 ? `envío S/ ${costoEnvio.toFixed(2)} aparte` : 'envío aparte'
  return {
    total: `S/ ${total.toFixed(2)}`,
    caption: `💰 S/ ${total.toFixed(2)} (incluye IGV y tarifa de servicio de 3%) · ${envio}`,
    voz: `Precio total: ${soles} soles${centimos === '00' ? '' : ` con ${Number(centimos)} ${Number(centimos) === 1 ? 'céntimo' : 'céntimos'}`}, más el envío. `,
  }
}
