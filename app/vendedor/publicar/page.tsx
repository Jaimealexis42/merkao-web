'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { getPctPorNombre } from '@/lib/comisiones'
import { Icon } from '@/lib/icons'

const CATEGORIAS_MAP: { nombre: string; id: number }[] = [
  { nombre: 'Ropa y Moda',    id: 1 },
  { nombre: 'Electrónicos',   id: 2 },
  { nombre: 'Alimentos',      id: 3 },
  { nombre: 'Artesanías',     id: 4 },
  { nombre: 'Hogar',          id: 5 },
  { nombre: 'Autos y Motos',  id: 6 },
  { nombre: 'Agrícola',       id: 7 },
  { nombre: 'Otros',          id: 8 },
  { nombre: 'Salud y Belleza', id: 9 },
  { nombre: 'Deportes',       id: 10 },
  { nombre: 'Juguetes',       id: 11 },
  { nombre: 'Libros',         id: 12 },
]

const CIUDADES_PERU = [
  'Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos',
  'Cusco', 'Huancayo', 'Tacna', 'Pucallpa', 'Cajamarca', 'Chimbote',
  'Ayacucho', 'Juliaca', 'Ica', 'Puno', 'Huánuco', 'Tarapoto',
]

const IGV = 0.18

export default function PublicarProducto() {
  const { user } = useAuth()

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    precio_oferta: '',
    precio_mayoreo: '',
    cantidad_minima_mayoreo: '',
    costo_envio: '0',
    ciudad: '',
    categoria: '',
    stock: '1',
    condicion: 'nuevo',
  })
  const [loading, setLoading] = useState(false)
  const [exito, setExito]     = useState(false)
  const [error, setError]     = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const setSeg = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setExito(false)

    const catObj = CATEGORIAS_MAP.find((c) => c.nombre === form.categoria)

    const { error: sbError } = await supabase.from('productos').insert([{
      nombre:                    form.nombre,
      descripcion:               form.descripcion,
      precio:                    parseFloat(form.precio),
      precio_oferta:             form.precio_oferta ? parseFloat(form.precio_oferta) : null,
      precio_mayoreo:            form.precio_mayoreo ? parseFloat(form.precio_mayoreo) : null,
      cantidad_minima_mayoreo:   form.cantidad_minima_mayoreo ? parseInt(form.cantidad_minima_mayoreo) : null,
      costo_envio:               parseFloat(form.costo_envio || '0'),
      ciudad:                    form.ciudad || null,
      categoria:                 form.categoria,
      categoria_id:              catObj?.id ?? null,
      stock:                     parseInt(form.stock),
      condicion:                 form.condicion,
      estado:                    'activo',
      vendedor_id:               user?.id ?? null,
    }])

    setLoading(false)

    if (sbError) {
      setError('Ocurrió un error al publicar el producto. Intenta de nuevo.')
    } else {
      setExito(true)
      setForm({
        nombre: '', descripcion: '', precio: '', precio_oferta: '',
        precio_mayoreo: '', cantidad_minima_mayoreo: '', costo_envio: '0',
        ciudad: '', categoria: '', stock: '1', condicion: 'nuevo',
      })
    }
  }

  const base  = parseFloat(form.precio) || 0
  const igv   = base * IGV
  const total = base + igv

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <h1>Publicar producto</h1>
          <p>Completa los datos para poner tu producto a la venta en Merkao.</p>
        </div>
        <a href="/vendedor/mis-productos" className="mk-btn mk-btn-ghost">
          <Icon name="chevronLeft" size={14} /> Cancelar
        </a>
      </div>

      {exito && (
        <div className="mk-vpanel" style={{ background: 'var(--green-tint)', borderColor: 'var(--green)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="checkCircle" size={22} style={{ color: 'var(--green)' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>¡Producto publicado con éxito!</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>Ya está visible en el marketplace.</p>
            </div>
            <a href="/vendedor/mis-productos" className="mk-btn mk-btn-ghost">Ver mis productos</a>
          </div>
        </div>
      )}

      {error && (
        <div className="mk-vpanel" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#B91C1C' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
            <Icon name="lock" size={18} /> {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Información básica */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head"><div><h3>Información básica</h3></div></div>

          <div className="mk-vform">
            <div className="mk-vfield">
              <label>Nombre del producto <span className="req">*</span></label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: Chompa de alpaca hecha a mano"
                required
                maxLength={120}
              />
              <span className="mk-vfield-counter">{form.nombre.length}/120</span>
            </div>

            <div className="mk-vfield">
              <label>Descripción <span className="req">*</span></label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Describe materiales, medidas, colores, historia del producto…"
                required
                rows={4}
                maxLength={1000}
              />
              <span className="mk-vfield-counter">{form.descripcion.length}/1000</span>
            </div>

            <div className="mk-vfield-row three">
              <div className="mk-vfield">
                <label>Categoría <span className="req">*</span></label>
                <select name="categoria" value={form.categoria} onChange={handleChange} required>
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIAS_MAP.map((c) => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
                {form.categoria && (() => {
                  const pct = getPctPorNombre(form.categoria)
                  if (pct === null) return null
                  return (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <span className="mk-vbadge green">0% los primeros 3 meses</span>
                      <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>después {pct}%</span>
                    </div>
                  )
                })()}
              </div>

              <div className="mk-vfield">
                <label>Ciudad</label>
                <select name="ciudad" value={form.ciudad} onChange={handleChange}>
                  <option value="">Selecciona ciudad</option>
                  {CIUDADES_PERU.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="mk-vfield">
                <label>Condición</label>
                <div className="mk-vseg">
                  {[['nuevo', 'Nuevo'], ['usado', 'Usado']].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSeg('condicion', v)}
                      className={form.condicion === v ? 'on' : ''}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Precio y stock */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head"><div><h3>Precio y stock</h3></div></div>

          <div className="mk-vform">
            <div className="mk-vfield-row three">
              <div className="mk-vfield">
                <label>Precio unitario <span className="req">*</span></label>
                <div className="mk-vfield-money">
                  <span className="mk-vfield-cur">S/</span>
                  <input type="number" name="precio" value={form.precio} onChange={handleChange} placeholder="0.00" required min="0.01" step="0.01" />
                </div>
              </div>
              <div className="mk-vfield">
                <label>Precio de oferta <span style={{ color: 'var(--muted-2)', fontWeight: 500 }}>opcional</span></label>
                <div className="mk-vfield-money">
                  <span className="mk-vfield-cur">S/</span>
                  <input type="number" name="precio_oferta" value={form.precio_oferta} onChange={handleChange} placeholder="0.00" min="0.01" step="0.01" />
                </div>
              </div>
              <div className="mk-vfield">
                <label>Stock disponible <span className="req">*</span></label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange} required min="0" />
              </div>
            </div>

            {base > 0 && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 11, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', padding: '4px 0' }}>
                  <span>Precio base</span><span>S/ {base.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', padding: '4px 0' }}>
                  <span>+ IGV 18%</span><span>S/ {igv.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: 'var(--ink)', padding: '8px 0 4px', borderTop: '1px dashed var(--line)', marginTop: 4 }}>
                  <span>Total al comprador</span><span>S/ {total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mayoreo */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head">
            <div>
              <h3>Venta al por mayor</h3>
              <span className="mk-vpanel-sub">Opcional. Si el comprador pide la cantidad mínima o más, se aplica el precio mayoreo automáticamente.</span>
            </div>
          </div>

          <div className="mk-vfield-row">
            <div className="mk-vfield">
              <label>Precio mayoreo <span style={{ color: 'var(--muted-2)', fontWeight: 500 }}>opcional</span></label>
              <div className="mk-vfield-money">
                <span className="mk-vfield-cur">S/</span>
                <input type="number" name="precio_mayoreo" value={form.precio_mayoreo} onChange={handleChange} placeholder="0.00" min="0.01" step="0.01" />
              </div>
            </div>
            <div className="mk-vfield">
              <label>Cantidad mínima <span style={{ color: 'var(--muted-2)', fontWeight: 500 }}>unidades</span></label>
              <input type="number" name="cantidad_minima_mayoreo" value={form.cantidad_minima_mayoreo} onChange={handleChange} placeholder="Ej: 10" min="2" />
            </div>
          </div>

          {form.precio && form.precio_mayoreo && (
            <div style={{ background: 'var(--green-tint)', border: '1px solid #BFE0CD', borderRadius: 10, padding: '10px 13px', fontSize: 12.5, color: 'var(--green)', fontWeight: 600 }}>
              Comprando {form.cantidad_minima_mayoreo || '?'}+ unidades pagarán <strong>S/ {form.precio_mayoreo}</strong> c/u en vez de <strong>S/ {form.precio}</strong>
            </div>
          )}
        </div>

        {/* Envío */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head">
            <div>
              <h3>Costo de envío</h3>
              <span className="mk-vpanel-sub">Costo fijo de flete. Déjalo en 0 si prefieres acordarlo con el comprador.</span>
            </div>
          </div>

          <div className="mk-vfield" style={{ maxWidth: 280 }}>
            <div className="mk-vfield-money">
              <span className="mk-vfield-cur">S/</span>
              <input type="number" name="costo_envio" value={form.costo_envio} onChange={handleChange} placeholder="0.00" min="0" step="0.01" />
            </div>
            <span className="mk-vfield-hint">
              <Icon name="truck" size={12} stroke={1.8} />{' '}
              {parseFloat(form.costo_envio || '0') === 0
                ? 'Se mostrará como "Flete a acordar con comprador"'
                : `El comprador verá flete S/ ${form.costo_envio}`}
            </span>
          </div>
        </div>

        {/* Fotos placeholder */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head"><div><h3>Fotos del producto</h3></div></div>
          <div className="mk-vempty">
            <Icon name="eye" size={28} stroke={1.5} />
            <p>Carga de fotos próximamente. Por ahora se mostrará un ícono según la categoría.</p>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" disabled={loading} className="mk-btn mk-btn-primary" style={{ padding: '13px 22px', fontSize: 15 }}>
            {loading ? 'Publicando…' : <><Icon name="check" size={17} /> Publicar producto</>}
          </button>
          <a href="/vendedor" className="mk-btn mk-btn-ghost">Cancelar</a>
        </div>
      </form>
    </>
  )
}
