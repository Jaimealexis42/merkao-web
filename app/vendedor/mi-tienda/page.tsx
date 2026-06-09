'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { fmt } from '@/lib/precios'
import { Icon } from '@/lib/icons'

type Tienda = { nombre: string; descripcion: string; logo_url: string }
const EMPTY: Tienda = { nombre: '', descripcion: '', logo_url: '' }

type Stats = {
  productosActivos: number
  productosTotal: number
  ventasCompletadas: number
  ingresos: number
}
const EMPTY_STATS: Stats = { productosActivos: 0, productosTotal: 0, ventasCompletadas: 0, ingresos: 0 }
const ESTADOS_COMPLETADA = ['entregado', 'liberado']

export default function MiTiendaPage() {
  const { user, loading: authLoading } = useAuth()

  const [tienda, setTienda]       = useState<Tienda>(EMPTY)
  const [stats, setStats]         = useState<Stats>(EMPTY_STATS)
  const [loading, setLoading]     = useState(true)
  const [editMode, setEditMode]   = useState(false)
  const [form, setForm]           = useState<Tienda>(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState(false)
  const [copiado, setCopiado]     = useState(false)

  useEffect(() => {
    if (!user) return
    let cancel = false

    const cargar = async () => {
      setLoading(true)
      setError('')

      const [tiendaRes, productosRes, pedidosRes] = await Promise.all([
        supabase.from('tiendas').select('nombre, descripcion, logo_url').eq('id', user.id).maybeSingle(),
        supabase.from('productos').select('id, estado').eq('vendedor_id', user.id),
        supabase.from('pedidos').select('id, total, estado').eq('vendedor_id', user.id),
      ])

      if (cancel) return

      const tiendaData: Tienda = {
        nombre:      tiendaRes.data?.nombre      ?? '',
        descripcion: tiendaRes.data?.descripcion ?? '',
        logo_url:    tiendaRes.data?.logo_url    ?? '',
      }
      setTienda(tiendaData)
      setForm(tiendaData)

      const productos = productosRes.data ?? []
      const pedidos   = pedidosRes.data ?? []
      const completados = pedidos.filter((p) => ESTADOS_COMPLETADA.includes(p.estado))

      setStats({
        productosActivos:  productos.filter((p) => p.estado === 'activo').length,
        productosTotal:    productos.length,
        ventasCompletadas: completados.length,
        ingresos:          completados.reduce((a, p) => a + (Number(p.total) || 0), 0),
      })

      setLoading(false)
    }

    cargar()
    return () => { cancel = true }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setGuardando(true)
    setError('')
    setExito(false)

    const { error: sbError } = await supabase.from('tiendas').upsert(
      {
        id:          user.id,
        nombre:      form.nombre.trim()      || null,
        descripcion: form.descripcion.trim() || null,
        logo_url:    form.logo_url.trim()    || null,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    if (sbError) {
      setError('No se pudo guardar la tienda: ' + sbError.message)
    } else {
      setTienda(form)
      setEditMode(false)
      setExito(true)
      setTimeout(() => setExito(false), 4000)
    }
    setGuardando(false)
  }

  const handleCopiarLink = async () => {
    if (!user) return
    const url = `${window.location.origin}/tienda/${user.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      window.prompt('Copia el link de tu tienda:', url)
    }
  }

  if (authLoading || loading) {
    return <div className="mk-vempty"><p style={{ color: 'var(--muted-2)' }}>Cargando tienda…</p></div>
  }

  if (!user) return null

  const nombreVisible = tienda.nombre || user.email?.split('@')[0] || 'Mi tienda'
  const inicial = (tienda.nombre || user.email || 'M')[0].toUpperCase()
  const publicUrl = `/tienda/${user.id}`

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <h1>Mi tienda</h1>
          <p>Personaliza cómo te ven los compradores en Merkao.</p>
        </div>
        {!editMode && (
          <button onClick={() => setEditMode(true)} className="mk-btn mk-btn-primary">
            <Icon name="edit" size={16} /> Editar perfil
          </button>
        )}
      </div>

      {exito && (
        <div className="mk-vpanel" style={{ background: 'var(--green-tint)', borderColor: 'var(--green)', color: 'var(--green)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="checkCircle" size={20} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Cambios guardados correctamente.</span>
          </div>
        </div>
      )}
      {error && (
        <div className="mk-vpanel" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#B91C1C' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="lock" size={20} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{error}</span>
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className="mk-vpanel">
        {!editMode ? (
          <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flexShrink: 0 }}>
              {tienda.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={tienda.logo_url} alt={nombreVisible} style={{ width: 96, height: 96, borderRadius: 16, objectFit: 'cover', border: '4px solid var(--brand-tint)' }} />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: 16, background: 'linear-gradient(135deg, var(--brand), var(--brand-700))', color: '#fff', fontSize: 38, fontWeight: 800, display: 'grid', placeItems: 'center', border: '4px solid var(--brand-tint)' }}>
                  {inicial}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>{nombreVisible}</h2>
              <p style={{ fontSize: 12, color: 'var(--muted-2)', margin: '4px 0 12px' }}>{user.email}</p>
              <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, whiteSpace: 'pre-line' }}>
                {tienda.descripcion || (
                  <span style={{ color: 'var(--muted-2)', fontStyle: 'italic' }}>
                    Aún no agregaste una descripción. Cuéntales a los compradores qué hace especial a tu tienda.
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGuardar} className="mk-vform">
            <div className="mk-vfield">
              <label>Nombre de la tienda <span className="req">*</span></label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Tejidos Andinos del Cusco" required maxLength={80} />
            </div>
            <div className="mk-vfield">
              <label>Descripción</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="¿Qué vendes? ¿Por qué deberían comprarte?" maxLength={500} rows={4} />
              <span className="mk-vfield-counter">{form.descripcion.length}/500</span>
            </div>
            <div className="mk-vfield">
              <label>URL del logo</label>
              <input type="url" name="logo_url" value={form.logo_url} onChange={handleChange} placeholder="https://..." />
              <span className="mk-vfield-hint">Pega la URL pública de tu logo (formato cuadrado recomendado).</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={guardando} className="mk-btn mk-btn-primary" style={{ flex: 1 }}>
                {guardando ? 'Guardando…' : <><Icon name="check" size={16} /> Guardar cambios</>}
              </button>
              <button type="button" onClick={() => { setForm(tienda); setEditMode(false) }} className="mk-btn mk-btn-ghost">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Link público */}
      {!editMode && (
        <div className="mk-vpanel">
          <div className="mk-vpanel-head">
            <div>
              <h3><Icon name="globe" size={17} stroke={1.9} /> Link público a tu tienda</h3>
              <span className="mk-vpanel-sub">Comparte este link con tus clientes para que vean todos tus productos.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <code style={{ flex: 1, minWidth: 0, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px', fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}${publicUrl}` : publicUrl}
            </code>
            <button onClick={handleCopiarLink} className="mk-btn mk-btn-ghost">
              <Icon name="copy" size={14} /> {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mk-btn mk-btn-primary">
              <Icon name="eye" size={14} /> Ver tienda
            </a>
          </div>
        </div>
      )}

      {/* Stats */}
      {!editMode && (
        <div className="mk-vstats">
          <div className="mk-vstat">
            <div className="mk-vstat-top">
              <span className="mk-vstat-label">Productos activos</span>
              <span className="mk-vstat-ico navy"><Icon name="box" size={18} stroke={1.9} /></span>
            </div>
            <div className="mk-vstat-value">{stats.productosActivos}</div>
            <div className="mk-vstat-foot">
              <span className="mk-vstat-sub">de {stats.productosTotal} publicados</span>
            </div>
          </div>
          <div className="mk-vstat">
            <div className="mk-vstat-top">
              <span className="mk-vstat-label">Ventas completadas</span>
              <span className="mk-vstat-ico green"><Icon name="checkCircle" size={18} stroke={1.9} /></span>
            </div>
            <div className="mk-vstat-value">{stats.ventasCompletadas}</div>
            <div className="mk-vstat-foot">
              <span className="mk-vstat-sub">entregadas o liberadas</span>
            </div>
          </div>
          <div className="mk-vstat">
            <div className="mk-vstat-top">
              <span className="mk-vstat-label">Ingresos acumulados</span>
              <span className="mk-vstat-ico brand"><Icon name="wallet" size={18} stroke={1.9} /></span>
            </div>
            <div className="mk-vstat-value">{fmt(stats.ingresos)}</div>
            <div className="mk-vstat-foot">
              <span className="mk-vstat-sub">de ventas confirmadas</span>
            </div>
          </div>
          <div className="mk-vstat">
            <div className="mk-vstat-top">
              <span className="mk-vstat-label">Valoración</span>
              <span className="mk-vstat-ico amber"><Icon name="star" size={18} stroke={1.9} /></span>
            </div>
            <div className="mk-vstat-value">—</div>
            <div className="mk-vstat-foot">
              <span className="mk-vstat-sub">Sin reseñas aún</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
