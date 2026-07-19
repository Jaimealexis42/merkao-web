'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { getPct } from '@/lib/comisiones'
import { fmt } from '@/lib/precios'
import { Icon } from '@/lib/icons'

type Producto = {
  id: string
  nombre: string
  precio: number
  categoria_id: number | null
  stock: number
  estado: string
  created_at: string
  imagenes: string[] | null
}

const CAT_NAMES: Record<number, string> = {
  1: 'Ropa y Moda',    2: 'Electrónicos', 3: 'Alimentos',     4: 'Artesanías',
  5: 'Hogar',          6: 'Autos y Motos', 7: 'Agrícola',     8: 'Otros',
  9: 'Salud y Belleza', 10: 'Deportes',   11: 'Juguetes',    12: 'Libros',
}

type Tab = 'todos' | 'activo' | 'inactivo' | 'sinstock'

const TABS: { id: Tab; label: string }[] = [
  { id: 'todos',    label: 'Todos' },
  { id: 'activo',   label: 'Activos' },
  { id: 'sinstock', label: 'Sin stock' },
  { id: 'inactivo', label: 'Pausados' },
]

export default function MisProductos() {
  const { user } = useAuth()
  const [productos, setProductos]   = useState<Producto[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [tab, setTab]               = useState<Tab>('todos')
  const [busqueda, setBusqueda]     = useState('')
  const [eliminando, setEliminando] = useState<string | null>(null)

  const cargarProductos = async (vendedorId: string) => {
    setLoading(true)
    setError('')
    const { data, error: sbError } = await supabase
      .from('productos')
      .select('*')
      .eq('vendedor_id', vendedorId)
      .order('created_at', { ascending: false })

    if (sbError) {
      setError('No se pudieron cargar los productos.')
    } else {
      setProductos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user?.id) cargarProductos(user.id)
  }, [user?.id])

  const toggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo'
    const { error: sbError } = await supabase
      .from('productos')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (!sbError) {
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      )
    }
  }

  const eliminarProducto = async (id: string) => {
    if (!confirm('¿Eliminar este producto? No se puede deshacer.')) return
    setEliminando(id)
    const { error: sbError } = await supabase.from('productos').delete().eq('id', id)
    if (!sbError) {
      setProductos((prev) => prev.filter((p) => p.id !== id))
    }
    setEliminando(null)
  }

  const counts = {
    todos:    productos.length,
    activo:   productos.filter((p) => p.estado === 'activo').length,
    sinstock: productos.filter((p) => p.stock === 0).length,
    inactivo: productos.filter((p) => p.estado === 'inactivo').length,
  }

  const productosFiltrados = productos.filter((p) => {
    if (tab === 'activo'   && p.estado !== 'activo') return false
    if (tab === 'sinstock' && p.stock !== 0)         return false
    if (tab === 'inactivo' && p.estado !== 'inactivo') return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <h1>Mis productos</h1>
          <p>Gestiona tu catálogo, stock y precios.</p>
        </div>
        <a href="/vendedor/publicar" className="mk-btn mk-btn-primary">
          <Icon name="plus" size={17} /> Publicar producto
        </a>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div className="mk-cat-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={'mk-cat-tab' + (tab === t.id ? ' on' : '')}
            >
              {t.label} <span className="mk-cat-tab-n">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="mk-vhdr-search" style={{ flex: 1, maxWidth: 360, height: 42 }}>
          <Icon name="search" size={16} />
          <input
            placeholder="Buscar en mi catálogo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mk-vempty" style={{ color: '#B91C1C', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <Icon name="lock" size={24} />
          <p>{error}</p>
          <button onClick={() => user?.id && cargarProductos(user.id)} className="mk-btn mk-btn-ghost">Reintentar</button>
        </div>
      )}

      {loading && (
        <div className="mk-vempty">
          <p style={{ color: 'var(--muted-2)' }}>Cargando productos…</p>
        </div>
      )}

      {!loading && !error && productosFiltrados.length === 0 && (
        <div className="mk-vempty">
          <Icon name="box" size={36} stroke={1.5} />
          <p>{busqueda ? 'No encontramos productos con esa búsqueda.' : 'No hay productos en esta categoría.'}</p>
          {!busqueda && tab === 'todos' && (
            <a href="/vendedor/publicar" className="mk-btn mk-btn-primary">
              <Icon name="plus" size={16} /> Publica tu primer producto
            </a>
          )}
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && productosFiltrados.length > 0 && (
        <div className="mk-vpanel" style={{ padding: 0 }}>
          <div className="mk-vtable-wrap">
            <table className="mk-vtable">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => {
                  const stockTone =
                    p.stock === 0 ? 'red' : p.stock < 10 ? 'amber' : 'green'
                  const estadoMeta =
                    p.estado === 'activo'   ? { label: 'Activo',  tone: 'green' as const } :
                    p.estado === 'inactivo' ? { label: 'Pausado', tone: 'amber' as const } :
                                              { label: p.estado,  tone: 'gray'  as const }
                  const pct = p.categoria_id ? getPct(p.categoria_id) : null

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                          <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--line-2)', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                            {p.imagenes?.[0] ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={p.imagenes[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Icon name="box" size={20} stroke={1.5} className="mk-ph-ico" style={{ color: 'var(--muted-2)' }} />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="mk-vorder-prod">{p.nombre}</div>
                            <div className="mk-vorder-date" style={{ fontSize: 11.5 }}>
                              {p.categoria_id != null ? (CAT_NAMES[p.categoria_id] ?? 'Sin categoría') : 'Sin categoría'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{fmt(p.precio)}</strong>
                      </td>
                      <td>
                        <span className={'mk-vbadge ' + stockTone}>
                          {p.stock === 0 ? 'Sin stock' : `${p.stock} uds.`}
                        </span>
                      </td>
                      <td>
                        {pct !== null ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-700)' }}>{pct}%</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={'mk-vbadge ' + estadoMeta.tone}>{estadoMeta.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => toggleEstado(p.id, p.estado)}
                            className="mk-vorder-more"
                            title={p.estado === 'activo' ? 'Pausar' : 'Activar'}
                          >
                            <Icon name={p.estado === 'activo' ? 'pause' : 'play'} size={16} stroke={1.9} />
                          </button>
                          <a
                            href={`/productos/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mk-vorder-more"
                            title="Ver en marketplace"
                          >
                            <Icon name="eye" size={16} stroke={1.9} />
                          </a>
                          <button
                            onClick={() => eliminarProducto(p.id)}
                            disabled={eliminando === p.id}
                            className="mk-vorder-more"
                            title="Eliminar"
                            style={eliminando === p.id ? { opacity: 0.4 } : undefined}
                          >
                            <Icon name="trash" size={16} stroke={1.9} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
