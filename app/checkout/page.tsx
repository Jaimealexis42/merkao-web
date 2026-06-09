'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt, ARANCELES } from '@/lib/precios'
import { Icon, type IconName } from '@/lib/icons'
import { DEPARTAMENTOS_PERU } from '@/lib/peru-geo'

type Producto = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  precio_mayoreo?: number
  cantidad_minima_mayoreo?: number
  costo_envio?: number
  imagenes: string[]
  ciudad: string
  categoria_id: number
  stock: number
}

type MetodoPago = {
  id: 'yape' | 'plin' | 'tarjeta' | 'efectivo'
  label: string
  hint: string
  icon: IconName
}

const METODOS_PAGO: MetodoPago[] = [
  { id: 'yape',     label: 'Yape',                       hint: 'Billetera móvil',  icon: 'zap' },
  { id: 'plin',     label: 'Plin',                       hint: 'Billetera móvil',  icon: 'zap' },
  { id: 'tarjeta',  label: 'Tarjeta crédito/débito',     hint: 'Visa · Mastercard', icon: 'card' },
  { id: 'efectivo', label: 'Efectivo contra entrega',    hint: 'Solo Lima Metro.',  icon: 'wallet' },
]

const TIMELINE: { icon: IconName; label: string; desc: string }[] = [
  { icon: 'card',   label: 'Pagado',    desc: 'Tu pago está retenido en Escrow.' },
  { icon: 'box',    label: 'Enviado',   desc: 'El vendedor despacha tu pedido.' },
  { icon: 'home',   label: 'Entregado', desc: 'Recibes el producto.' },
  { icon: 'wallet', label: 'Liberado',  desc: 'Confirmás → vendedor cobra.' },
]

function CheckoutContent() {
  const params = useSearchParams()
  const productoId = params.get('id')

  const [producto, setProducto] = useState<Producto | null>(null)
  const [loadingProd, setLoadingProd] = useState(true)
  const [pais, setPais] = useState('PE')
  const [metodoPago, setMetodoPago] = useState<MetodoPago['id']>('yape')
  const [cantidad, setCantidad] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    departamento: 'Lima',
    distrito: '',
    direccion: '',
    referencia: '',
    notas: '',
  })

  const culqiDataRef = useRef<{ token: string; monto: number; email: string } | null>(null)

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((d) => {
        if (d?.country_code) setPais(d.country_code)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!productoId) {
      setLoadingProd(false)
      return
    }
    supabase
      .from('productos')
      .select(
        'id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, imagenes, ciudad, categoria_id, stock',
      )
      .eq('id', productoId)
      .single()
      .then(({ data, error: e }) => {
        if (e || !data) setError('Producto no encontrado.')
        else setProducto(data as Producto)
        setLoadingProd(false)
      })
  }, [productoId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm({ ...form, [e.target.name]: e.target.value })

  const esMayoreo = !!(
    producto?.precio_mayoreo &&
    producto?.cantidad_minima_mayoreo &&
    cantidad >= producto.cantidad_minima_mayoreo
  )
  const precioUnitario = esMayoreo
    ? producto!.precio_mayoreo!
    : producto?.precio ?? 0
  const costoEnvio = producto?.costo_envio ?? 0
  const p = calcularPrecios(precioUnitario * cantidad, pais)
  const totalConEnvio = +(p.total + costoEnvio).toFixed(2)
  const totalFinal = costoEnvio > 0 ? totalConEnvio : p.total

  const direccionCompleta = [
    form.direccion.trim(),
    form.referencia.trim() ? `(${form.referencia.trim()})` : '',
    form.distrito.trim(),
    form.departamento,
    'Perú',
  ]
    .filter(Boolean)
    .join(', ')

  const handlePagarCulqi = (e: React.FormEvent) => {
    e.preventDefault()
    if (!producto) return
    setError('')

    const montoCentimos = Math.round(totalFinal * 100)

    const CulqiSDK = (window as unknown as { Culqi?: any }).Culqi
    if (typeof CulqiSDK === 'undefined' || CulqiSDK === null) {
      setError('El script de Culqi no cargó. Recarga la página.')
      return
    }

    CulqiSDK.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
    CulqiSDK.settings({
      title: 'Merkao',
      currency: 'PEN',
      amount: montoCentimos,
      description: producto.nombre.slice(0, 80),
    })

    culqiDataRef.current = { token: '', monto: montoCentimos, email: form.email }

    ;(window as unknown as { culqi?: () => Promise<void> }).culqi = async () => {
      const token = CulqiSDK.token
      const err = CulqiSDK.error
      if (err) {
        setError(err.user_message ?? 'Error al procesar la tarjeta.')
        return
      }
      if (!token) return

      setEnviando(true)
      const res = await fetch('/api/culqi-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.id,
          monto: montoCentimos,
          email: form.email,
          producto_id: producto.id,
          cantidad,
          precio_unitario: precioUnitario,
          nombre_comprador: form.nombre,
          telefono: form.telefono,
          direccion: direccionCompleta,
          notas: form.notas || null,
          pais_comprador: pais,
          igv: p.igv,
          arancel: p.arancel,
          metodo_pago: metodoPago,
        }),
      })

      const result = await res.json()
      setEnviando(false)
      if (!res.ok) setError(result.error ?? 'Error al procesar el cobro. Intenta de nuevo.')
      else setPedidoId(result.pedido_id)
    }

    CulqiSDK.open()
  }

  // ── Pantalla de éxito ──────────────────────────────────────
  if (pedidoId) {
    return (
      <>
        <header className="mk-chdr">
          <div className="mk-chdr-inner">
            <Link href="/" className="mk-logo">
              merkao<span className="mk-logo-dot">.pe</span>
            </Link>
            <span className="mk-chdr-secure">
              <Icon name="checkCircle" size={15} stroke={2} /> Pedido recibido
            </span>
          </div>
        </header>

        <div className="mk-ck-success">
          <div className="mk-ck-success-ico">
            <Icon name="shield" size={36} stroke={1.8} />
          </div>
          <h1>¡Pago recibido y protegido!</h1>
          <p>
            Tu dinero está retenido en Escrow. Lo liberamos al vendedor cuando confirmes que
            recibiste el producto en buen estado.
          </p>

          <div className="mk-ck-timeline">
            {TIMELINE.map((t, i) => (
              <div key={t.label} className={'mk-ck-tl-row' + (i === 0 ? ' on' : '')}>
                <span className="mk-ck-tl-ico">
                  <Icon name={t.icon} size={16} stroke={2} />
                </span>
                <div>
                  <strong>{t.label}</strong>
                  <small>{t.desc}</small>
                </div>
              </div>
            ))}
          </div>

          <p className="mk-ck-success-code">
            ID de pedido: <code>{pedidoId}</code>
          </p>

          <div className="mk-ck-success-actions">
            <Link href={`/pedidos/${pedidoId}`} className="mk-btn mk-btn-primary">
              Ver mi pedido <Icon name="arrowRight" size={16} />
            </Link>
            <Link href="/" className="mk-btn mk-btn-ghost">
              Seguir comprando
            </Link>
          </div>
        </div>
      </>
    )
  }

  if (loadingProd) {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Cargando producto…</p>
      </div>
    )
  }

  if (!producto || !productoId) {
    return (
      <div className="mk-empty-page">
        <Icon name="box" size={56} stroke={1.3} />
        <h2>Producto no encontrado</h2>
        <p>El producto que intentas comprar no existe o ya no está disponible.</p>
        <Link href="/" className="mk-btn mk-btn-primary">
          Volver al inicio <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    )
  }

  const imagen = producto.imagenes?.[0] ?? `https://picsum.photos/seed/${producto.id}/400/400`
  const arancelInfo = ARANCELES[pais]
  const hayMayoreo = !!(producto.precio_mayoreo && producto.cantidad_minima_mayoreo)
  const ahorroMayoreo = hayMayoreo
    ? (producto.precio - producto.precio_mayoreo!) * cantidad
    : 0

  return (
    <>
      {/* ── Header ── */}
      <header className="mk-chdr">
        <div className="mk-chdr-inner">
          <Link href="/" className="mk-logo">
            merkao<span className="mk-logo-dot">.pe</span>
          </Link>
          <span className="mk-chdr-secure">
            <Icon name="lock" size={15} stroke={1.9} /> Checkout seguro · Pago Escrow
          </span>
          <Link href={`/productos/${producto.id}`} className="mk-chdr-help">
            <Icon name="chevronLeft" size={15} /> Volver al producto
          </Link>
        </div>
      </header>

      <div className="mk-cwrap">
        <form className="mk-ck-grid" onSubmit={handlePagarCulqi}>
          {/* ── Columna principal (form) ── */}
          <div className="mk-ck-main">
            {/* Producto + cantidad */}
            <section className="mk-ck-card">
              <div className="mk-ck-card-h">
                <Icon name="box" size={18} stroke={2} /> Producto
              </div>
              <div className="mk-ck-prod">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="mk-ck-prod-thumb">
                  <img src={imagen} alt={producto.nombre} />
                </div>
                <div className="mk-ck-prod-info">
                  <div className="mk-ck-prod-name">{producto.nombre}</div>
                  {producto.ciudad && (
                    <span className="mk-ck-prod-meta">
                      <Icon name="mapPin" size={12} stroke={2} /> {producto.ciudad}
                    </span>
                  )}
                  <div className="mk-ck-prod-price">
                    {fmt(precioUnitario)} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>c/u (con IGV)</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--line-2)', margin: '16px 0 14px' }} />

              <div className="mk-ck-qty-row">
                <div className="mk-ck-qty">
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    disabled={cantidad <= 1}
                    aria-label="Reducir cantidad"
                  >−</button>
                  <span>{cantidad}</span>
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.min(producto.stock, c + 1))}
                    disabled={cantidad >= producto.stock}
                    aria-label="Aumentar cantidad"
                  >+</button>
                </div>
                <span className="mk-ck-stock">Stock disponible: {producto.stock}</span>
              </div>

              {hayMayoreo && (
                <div className={'mk-ck-mayoreo ' + (esMayoreo ? 'green' : 'amber')}>
                  <Icon name={esMayoreo ? 'checkCircle' : 'tag'} size={16} stroke={1.9} />
                  {esMayoreo ? (
                    <span>
                      <strong>Precio mayoreo aplicado</strong> · {cantidad} uds a{' '}
                      <strong>{fmt(producto.precio_mayoreo!)}</strong> c/u (ahorras {fmt(ahorroMayoreo)}).
                    </span>
                  ) : (
                    <span>
                      Compra <strong>{producto.cantidad_minima_mayoreo}+ unidades</strong> para precio mayoreo a{' '}
                      <strong>{fmt(producto.precio_mayoreo!)}</strong> c/u.
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Datos del comprador */}
            <section className="mk-ck-card">
              <div className="mk-ck-card-h">
                <Icon name="user" size={18} stroke={2} /> Datos del comprador
              </div>

              <label className="mk-field">
                <span>Nombre completo *</span>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  required
                  autoComplete="name"
                />
              </label>

              <div className="mk-field-row-2">
                <label className="mk-field">
                  <span>Correo electrónico *</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="juan@email.com"
                    required
                    autoComplete="email"
                  />
                </label>
                <label className="mk-field">
                  <span>Teléfono / WhatsApp *</span>
                  <div className="mk-field-tel">
                    <span className="mk-field-tel-prefix">🇵🇪 +51</span>
                    <input
                      type="tel"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      placeholder="987 654 321"
                      required
                      inputMode="numeric"
                      autoComplete="tel-national"
                    />
                  </div>
                </label>
              </div>
            </section>

            {/* Envío */}
            <section className="mk-ck-card">
              <div className="mk-ck-card-h">
                <Icon name="truck" size={18} stroke={2} /> Dirección de envío
              </div>

              <div className="mk-field-row-2">
                <label className="mk-field">
                  <span>Departamento *</span>
                  <select
                    name="departamento"
                    value={form.departamento}
                    onChange={handleChange}
                    required
                  >
                    {DEPARTAMENTOS_PERU.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="mk-field">
                  <span>Distrito *</span>
                  <input
                    type="text"
                    name="distrito"
                    value={form.distrito}
                    onChange={handleChange}
                    placeholder="Miraflores"
                    required
                    autoComplete="address-level3"
                  />
                </label>
              </div>

              <label className="mk-field">
                <span>Dirección (calle y número) *</span>
                <input
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  placeholder="Av. Larco 345, Dpto. 502"
                  required
                  autoComplete="street-address"
                />
              </label>

              <label className="mk-field">
                <span>Referencia (opcional)</span>
                <input
                  type="text"
                  name="referencia"
                  value={form.referencia}
                  onChange={handleChange}
                  placeholder="Frente al parque Kennedy, edificio crema"
                />
              </label>

              <label className="mk-field">
                <span>País de entrega *</span>
                <select
                  name="pais"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  required
                >
                  <option value="PE">🇵🇪 Perú (sin arancel)</option>
                  {Object.entries(ARANCELES).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.bandera} {info.pais} (arancel {Math.round(info.tasa * 100)}%)
                    </option>
                  ))}
                </select>
              </label>

              <label className="mk-field">
                <span>Notas para el vendedor (opcional)</span>
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Talla, color, instrucciones de entrega…"
                />
              </label>
            </section>

            {/* Método de pago */}
            <section className="mk-ck-card">
              <div className="mk-ck-card-h">
                <Icon name="card" size={18} stroke={2} /> Método de pago
              </div>
              <p className="mk-ck-card-sub">
                Todos los métodos pasan por Pago Escrow: tu dinero queda retenido hasta que confirmes la entrega.
              </p>
              <div className="mk-ck-pays">
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id)}
                    className={'mk-ck-pay' + (metodoPago === m.id ? ' on' : '')}
                  >
                    <span className="mk-ck-pay-ico">
                      <Icon name={m.icon} size={16} stroke={2} />
                    </span>
                    <span>
                      {m.label}
                      <small style={{ display: 'block', fontWeight: 500, color: 'var(--muted)' }}>{m.hint}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mk-ck-secure">
                <Icon name="shield" size={16} stroke={2} />
                <span>
                  Tu pago quedará <strong>retenido en Escrow</strong> hasta que confirmes la recepción del producto.
                </span>
              </div>
            </section>

            {error && (
              <div className="mk-ck-error">
                <Icon name="lock" size={15} stroke={2} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mk-btn mk-btn-primary mk-ck-submit"
              style={enviando ? { opacity: 0.7, cursor: 'wait' } : undefined}
            >
              <Icon name="lock" size={16} stroke={2} />
              {enviando ? 'Procesando pago…' : `Pagar ${fmt(totalFinal)}`}
            </button>
          </div>

          {/* ── Columna aside (resumen) ── */}
          <aside className="mk-ck-aside">
            <div className="mk-summary">
              <h3 className="mk-summary-title">Resumen del pedido</h3>
              <div className="mk-summary-rows">
                <div className="mk-sm-row">
                  <span>
                    Precio unitario {esMayoreo && <small style={{ color: 'var(--green)', fontWeight: 700 }}> · mayoreo</small>}
                  </span>
                  <span>{fmt(precioUnitario)}</span>
                </div>
                <div className="mk-sm-row">
                  <span>× {cantidad} unidad{cantidad !== 1 ? 'es' : ''}</span>
                  <span>{fmt(precioUnitario * cantidad)}</span>
                </div>
                {esMayoreo && (
                  <div className="mk-sm-row" style={{ color: 'var(--green)' }}>
                    <span>Ahorro mayoreo</span>
                    <span style={{ color: 'var(--green)' }}>− {fmt(ahorroMayoreo)}</span>
                  </div>
                )}
                <div className="mk-sm-row">
                  <span>Subtotal (base)</span>
                  <span>{fmt(p.base)}</span>
                </div>
                <div className="mk-sm-row">
                  <span>IGV 18%</span>
                  <span>{fmt(p.igv)}</span>
                </div>
                <div className="mk-sm-row">
                  <span>Tarifa Merkao (3%)</span>
                  <span>+{fmt(p.tarifaServicio)}</span>
                </div>
                {p.arancel > 0 && arancelInfo && (
                  <div className="mk-sm-row amber">
                    <span>Arancel {arancelInfo.bandera} {Math.round(p.tasaArancel * 100)}%</span>
                    <span>+{fmt(p.arancel)}</span>
                  </div>
                )}
                <div className="mk-sm-row">
                  <span>Envío</span>
                  {costoEnvio === 0 ? (
                    <span className="mk-sm-free">A acordar con vendedor</span>
                  ) : (
                    <span>{fmt(costoEnvio)}</span>
                  )}
                </div>
              </div>

              <div className="mk-sm-total">
                <span>Total a pagar</span>
                <span>{fmt(totalFinal)}</span>
              </div>

              <div className="mk-sm-escrow">
                <span className="mk-sm-escrow-ico">
                  <Icon name="shield" size={18} stroke={1.8} />
                </span>
                <div>
                  <strong>Pago protegido con Escrow</strong>
                  <small>Retenemos tu dinero y solo lo liberamos al vendedor cuando confirmes que recibiste tu pedido.</small>
                </div>
              </div>

              <div className="mk-sm-pays">
                <span>Aceptamos</span>
                <div className="mk-sm-pays-list">Yape · Plin · Visa · Mastercard · Transferencia</div>
              </div>
            </div>

            {arancelInfo && (
              <div className="mk-ck-mayoreo amber">
                <Icon name="globe" size={16} stroke={1.9} />
                <span>
                  {arancelInfo.bandera} El arancel del {Math.round(p.tasaArancel * 100)}% corresponde a la importación a{' '}
                  <strong>{arancelInfo.pais}</strong>.
                </span>
              </div>
            )}
          </aside>
        </form>
      </div>
    </>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Cargando checkout…</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
