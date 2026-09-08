'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { getPct } from '@/lib/comisiones'
import { fmt } from '@/lib/precios'
import { Icon } from '@/lib/icons'

const MAX_FOTOS = 4
const MAX_MB    = 5

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

  // Subida de fotos para productos existentes
  const fotosFileRef                          = useRef<HTMLInputElement>(null)
  const [fotosId, setFotosId]                 = useState<string | null>(null)
  const [fotosFiles, setFotosFiles]           = useState<File[]>([])
  const [fotosPreviews, setFotosPreviews]     = useState<string[]>([])
  const [subiendo, setSubiendo]               = useState(false)
  const [fotosError, setFotosError]           = useState('')

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

  const abrirFotos = (id: string) => {
    fotosPreviews.forEach((u) => URL.revokeObjectURL(u))
    setFotosId(id)
    setFotosFiles([])
    setFotosPreviews([])
    setFotosError('')
  }

  const cerrarFotos = () => {
    fotosPreviews.forEach((u) => URL.revokeObjectURL(u))
    setFotosId(null)
    setFotosFiles([])
    setFotosPreviews([])
    setFotosError('')
  }

  const handleFotosPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    const combined = [...fotosFiles, ...picked].slice(0, MAX_FOTOS)
    const valid = combined.filter((f) => f.size <= MAX_MB * 1024 * 1024)
    setFotosError(valid.length < combined.length ? `Algunas fotos superan ${MAX_MB} MB y se ignoraron.` : '')
    const previews = valid.map((f) => URL.createObjectURL(f))
    setFotosFiles(valid)
    setFotosPreviews(previews)
    if (fotosFileRef.current) fotosFileRef.current.value = ''
  }

  const removeFoto = (idx: number) => {
    URL.revokeObjectURL(fotosPreviews[idx])
    setFotosFiles((prev) => prev.filter((_, i) => i !== idx))
    setFotosPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const subirFotos = async () => {
    if (!user || !fotosId || fotosFiles.length === 0) return
    setSubiendo(true)
    setFotosError('')
    const urls: string[] = []
    for (const file of fotosFiles) {
      const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('productos')
        .upload(path, file, { contentType: file.type })
      if (upErr) { console.error('[mis-productos] upload:', upErr); continue }
      const { data } = supabase.storage.from('productos').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    if (urls.length === 0) {
      setFotosError('No se pudo subir ninguna foto. Verifica que el bucket "productos" exista en Supabase Storage.')
      setSubiendo(false)
      return
    }
    const productoActual = productos.find((p) => p.id === fotosId)
    const actuales = productoActual?.imagenes ?? []
    const nuevas   = [...actuales, ...urls].slice(0, MAX_FOTOS)
    const { error: updErr } = await supabase
      .from('productos')
      .update({ imagenes: nuevas })
      .eq('id', fotosId)
    if (updErr) {
      setFotosError(`Error al guardar: ${updErr.message}`)
    } else {
      setProductos((prev) =>
        prev.map((p) => p.id === fotosId ? { ...p, imagenes: nuevas } : p)
      )
      cerrarFotos()
    }
    setSubiendo(false)
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

      {/* Input oculto para fotos */}
      <input
        ref={fotosFileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFotosPick}
        style={{ display: 'none' }}
      />

      {/* Panel de subida de fotos */}
      {fotosId && (
        <div className="mk-vpanel" style={{ borderColor: 'var(--brand)', background: 'var(--brand-tint, #F0F4FF)' }}>
          <div className="mk-vpanel-head">
            <div>
              <h3>Fotos del producto</h3>
              <span className="mk-vpanel-sub">
                {productos.find((p) => p.id === fotosId)?.nombre} · hasta {MAX_FOTOS} fotos · máx. {MAX_MB} MB c/u
              </span>
            </div>
            <button onClick={cerrarFotos} className="mk-btn mk-btn-ghost" style={{ fontSize: 13 }}>
              Cancelar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 14 }}>
            {fotosPreviews.map((src, i) => (
              <div
                key={i}
                style={{ position: 'relative', width: 90, height: 90, borderRadius: 10, overflow: 'hidden', border: '2px solid var(--line)', flexShrink: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => removeFoto(i)}
                  style={{
                    position: 'absolute', top: 3, right: 3,
                    background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%',
                    width: 20, height: 20, cursor: 'pointer', display: 'grid', placeItems: 'center',
                    color: '#fff', fontSize: 13, lineHeight: 1,
                  }}
                  aria-label="Quitar"
                >×</button>
                {i === 0 && (
                  <span style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 4px', borderRadius: 3 }}>
                    PRINCIPAL
                  </span>
                )}
              </div>
            ))}
            {fotosPreviews.length < MAX_FOTOS && (
              <button
                type="button"
                onClick={() => fotosFileRef.current?.click()}
                style={{
                  width: 90, height: 90, borderRadius: 10,
                  border: '2px dashed var(--line-2)', background: 'var(--bg)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  color: 'var(--muted-2)', flexShrink: 0,
                }}
              >
                <Icon name="plus" size={20} stroke={1.7} />
                <span style={{ fontSize: 10 }}>Agregar</span>
              </button>
            )}
          </div>

          {fotosError && (
            <p style={{ fontSize: 13, color: '#B91C1C', marginBottom: 10 }}>{fotosError}</p>
          )}

          <button
            onClick={subirFotos}
            disabled={subiendo || fotosFiles.length === 0}
            className="mk-btn mk-btn-primary"
            style={{ fontSize: 13 }}
          >
            {subiendo ? 'Subiendo…' : <><Icon name="check" size={15} /> Guardar fotos</>}
          </button>
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
                          <button
                            onClick={() => abrirFotos(p.id)}
                            className="mk-vorder-more"
                            title="Subir fotos"
                            style={!p.imagenes?.length ? { color: 'var(--brand)', fontWeight: 700 } : undefined}
                          >
                            <Icon name="eye" size={16} stroke={1.9} />
                          </button>
                          <a
                            href={`/productos/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mk-vorder-more"
                            title="Ver en marketplace"
                          >
                            <Icon name="arrowRight" size={16} stroke={1.9} />
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
