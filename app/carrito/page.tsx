'use client'
import { useCarritoStore } from '@/src/store/carritoStore'
import { fmt, TARIFA_SERVICIO } from '@/lib/precios'
import { Icon } from '@/lib/icons'

const IGV_TASA = 0.18

export default function CarritoPage() {
  const items           = useCarritoStore((s) => s.items)
  const cambiarCantidad = useCarritoStore((s) => s.cambiarCantidad)
  const quitarItem      = useCarritoStore((s) => s.quitarItem)
  const vaciarCarrito   = useCarritoStore((s) => s.vaciarCarrito)
  const totalItems      = useCarritoStore((s) => s.totalItems)
  const totalPrecio     = useCarritoStore((s) => s.totalPrecio)

  // Los precios en el store ya vienen con IGV. Descomponemos para mostrar el
  // desglose y agregamos la tarifa de servicio Merkao 3%.
  const totalConIGV    = totalPrecio()
  const subtotalBase   = +(totalConIGV / (1 + IGV_TASA)).toFixed(2)
  const montoIGV       = +(totalConIGV - subtotalBase).toFixed(2)
  const tarifaServicio = +(totalConIGV * TARIFA_SERVICIO).toFixed(2)
  const totalConTarifa = +(totalConIGV + tarifaServicio).toFixed(2)
  const totalUnidades  = totalItems()

  return (
    <>
      {/* ── Header ── */}
      <header className="mk-chdr">
        <div className="mk-chdr-inner">
          <a href="/" className="mk-logo">merkao<span className="mk-logo-dot">.pe</span></a>
          <div className="mk-chdr-secure">
            <Icon name="lock" size={15} stroke={1.9} /> Compra segura · Pago protegido con Escrow
          </div>
          <a href="/" className="mk-chdr-help">
            <Icon name="chevronLeft" size={15} /> Seguir comprando
          </a>
        </div>
      </header>

      <div className="mk-cwrap">

        {/* Carrito vacío */}
        {items.length === 0 && (
          <div className="mk-empty-page" style={{ minHeight: '50vh' }}>
            <Icon name="cart" size={56} stroke={1.3} />
            <h2>Tu carrito está vacío</h2>
            <p>Explora el marketplace y agrega productos que te interesen.</p>
            <a href="/" className="mk-btn mk-btn-primary" style={{ marginTop: 8 }}>
              Volver al inicio <Icon name="arrowRight" size={16} />
            </a>
          </div>
        )}

        {/* Carrito con items */}
        {items.length > 0 && (
          <div className="mk-cgrid">

            {/* ── Lista de items ── */}
            <main className="mk-cmain">
              <div className="mk-cart-list-head">
                <h2>
                  Tu carrito{' '}
                  <span>({items.length} producto{items.length !== 1 ? 's' : ''} · {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''})</span>
                </h2>
                <button onClick={vaciarCarrito} className="mk-cart-empty-btn">
                  Vaciar carrito
                </button>
              </div>

              {items.map((item) => (
                <article key={item.id} className="mk-citem">
                  <a href={`/productos/${item.id}`} className="mk-citem-media">
                    {item.imagen ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.imagen} alt={item.nombre} />
                    ) : (
                      <span className="mk-citem-media-ph">
                        <Icon name="box" size={28} stroke={1.5} />
                      </span>
                    )}
                  </a>

                  <div className="mk-citem-info">
                    <span className="mk-citem-cat">Producto</span>
                    <h3 className="mk-citem-name">
                      <a href={`/productos/${item.id}`}>{item.nombre}</a>
                    </h3>
                    <span className="mk-citem-seller">
                      <Icon name="store" size={12} stroke={1.8} /> {item.vendedor}
                    </span>
                    <span className="mk-citem-stock">
                      <Icon name="checkCircle" size={12} /> En stock
                    </span>
                  </div>

                  <div className="mk-citem-right">
                    <div className="mk-citem-price">{fmt(item.precio * item.cantidad)}</div>
                    <span className="mk-citem-unit">{fmt(item.precio)} c/u (con IGV)</span>
                    <div className="mk-citem-qty">
                      <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)} aria-label="Reducir">−</button>
                      <span>{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)} aria-label="Aumentar">+</button>
                    </div>
                    <button onClick={() => quitarItem(item.id)} className="mk-citem-remove">
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </main>

            {/* ── Resumen ── */}
            <aside className="mk-summary">
              <h3 className="mk-summary-title">Resumen del pedido</h3>
              <div className="mk-summary-rows">
                <div className="mk-sm-row">
                  <span>Productos ({totalUnidades})</span>
                  <span>{fmt(subtotalBase)}</span>
                </div>
                <div className="mk-sm-row">
                  <span>IGV (18%)</span>
                  <span>{fmt(montoIGV)}</span>
                </div>
                <div className="mk-sm-row">
                  <span>Tarifa Merkao (3%)</span>
                  <span>+{fmt(tarifaServicio)}</span>
                </div>
                <div className="mk-sm-row">
                  <span>Envío</span>
                  <span className="mk-sm-free">A acordar con vendedor</span>
                </div>
              </div>

              <div className="mk-sm-total">
                <span>Total</span>
                <span>{fmt(totalConTarifa)}</span>
              </div>

              <button
                disabled
                title="Función en desarrollo"
                className="mk-btn mk-btn-primary mk-sm-cta"
                style={{ opacity: 0.55, cursor: 'not-allowed' }}
              >
                <Icon name="lock" size={16} stroke={2} /> Proceder al pago
              </button>
              <p className="mk-sm-footer-note">Próximamente · IGV incluido · Tarifa Merkao 3%</p>

              <a href="/" className="mk-sm-back">
                <Icon name="chevronLeft" size={15} /> Seguir comprando
              </a>

              <div className="mk-sm-escrow">
                <span className="mk-sm-escrow-ico"><Icon name="shield" size={18} stroke={1.8} /></span>
                <div>
                  <strong>Pago protegido con Escrow</strong>
                  <small>Retenemos tu dinero y solo lo liberamos al vendedor cuando confirmes que recibiste tu pedido.</small>
                </div>
              </div>

              <div className="mk-sm-pays">
                <span>Aceptamos</span>
                <div className="mk-sm-pays-list">Yape · Plin · Visa · Mastercard · Transferencia</div>
              </div>
            </aside>

          </div>
        )}
      </div>
    </>
  )
}
