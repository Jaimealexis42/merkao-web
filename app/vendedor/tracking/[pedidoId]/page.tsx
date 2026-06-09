'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import {
  ESTADOS,
  ESTADO_META,
  type EstadoTracking,
  type TrackingEvento,
  mensajeWhatsApp,
  whatsappLink,
  normalizarTelefonoPeru,
} from '@/lib/tracking'
import {
  TRANSPORTISTAS,
  TRANSPORTISTA_META,
  type Transportista,
  linkTrackingExterno,
} from '@/lib/transportistas'
import { Icon } from '@/lib/icons'

interface Pedido {
  id: string
  vendedor_id: string | null
  nombre_comprador: string
  email_comprador: string
  telefono: string | null
  direccion_entrega: string | null
  estado: string
  created_at: string
}

export default function VendedorTrackingPage() {
  const { pedidoId } = useParams<{ pedidoId: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [eventos, setEventos] = useState<TrackingEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Form de nuevo evento
  const [nuevoEstado, setNuevoEstado] = useState<EstadoTracking>('preparando')
  const [notas, setNotas] = useState('')
  const [transportista, setTransportista] = useState<Transportista>('manual')
  const [numeroGuia, setNumeroGuia] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastInserted, setLastInserted] = useState<TrackingEvento | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!pedidoId || authLoading || !user) return
    ;(async () => {
      const { data: p, error: eP } = await supabase
        .from('pedidos')
        .select('id, vendedor_id, nombre_comprador, email_comprador, telefono, direccion_entrega, estado, created_at')
        .eq('id', pedidoId)
        .single()

      if (eP || !p) {
        setNotFound(true)
        setLoading(false)
        return
      }
      if (p.vendedor_id !== user.id) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      setPedido(p as Pedido)

      const { data: ev } = await supabase
        .from('order_tracking')
        .select('id, pedido_id, tracking_code, estado, notas, numero_guia, transportista, created_at, updated_at')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: true })

      if (ev) {
        setEventos(ev as TrackingEvento[])
        const ultimo = ev[ev.length - 1] as TrackingEvento | undefined
        if (ultimo?.numero_guia) setNumeroGuia(ultimo.numero_guia)
        if (ultimo?.transportista && (TRANSPORTISTAS as string[]).includes(ultimo.transportista)) {
          setTransportista(ultimo.transportista as Transportista)
        }
      }
      setLoading(false)
    })()
  }, [pedidoId, authLoading, user])

  const submit = async () => {
    if (!pedido || saving) return
    setError(null)
    setSaving(true)
    try {
      const insertPayload: Record<string, unknown> = {
        pedido_id: pedido.id,
        estado: nuevoEstado,
        notas: notas.trim() || null,
        numero_guia: numeroGuia.trim() || null,
        transportista,
      }
      if (eventos.length > 0) {
        insertPayload.tracking_code = eventos[0].tracking_code
      }

      const { data, error: e } = await supabase
        .from('order_tracking')
        .insert(insertPayload)
        .select('id, pedido_id, tracking_code, estado, notas, numero_guia, transportista, created_at, updated_at')
        .single()

      if (e) throw new Error(e.message)
      const inserted = data as TrackingEvento
      setEventos((prev) => [...prev, inserted])
      setLastInserted(inserted)
      setNotas('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el evento.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return <div className="mk-vempty"><p style={{ color: 'var(--muted-2)' }}>Cargando panel…</p></div>
  }

  if (notFound) {
    return (
      <div className="mk-vempty">
        <Icon name="box" size={36} stroke={1.5} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Pedido no encontrado</p>
        <a href="/vendedor/pedidos" className="mk-btn mk-btn-ghost">Volver a pedidos</a>
      </div>
    )
  }

  if (!authorized || !pedido) {
    return (
      <div className="mk-vempty">
        <Icon name="lock" size={36} stroke={1.5} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>No tienes permiso para ver este pedido</p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Este pedido no pertenece a tu tienda.</p>
        <a href="/vendedor/pedidos" className="mk-btn mk-btn-ghost">Volver a pedidos</a>
      </div>
    )
  }

  const ultimoEvento = eventos[eventos.length - 1] ?? null
  const trackingCode = ultimoEvento?.tracking_code ?? null
  const telNormalizado = normalizarTelefonoPeru(pedido.telefono)
  const eventoParaNotificar = lastInserted ?? ultimoEvento
  const waMessage = eventoParaNotificar
    ? mensajeWhatsApp({
        nombreComprador: pedido.nombre_comprador,
        estado: eventoParaNotificar.estado as EstadoTracking,
        trackingCode: eventoParaNotificar.tracking_code,
        notas: eventoParaNotificar.notas,
      })
    : null
  const waLink = waMessage ? whatsappLink({ telefono: pedido.telefono, mensaje: waMessage }) : null

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <button onClick={() => router.push('/vendedor/pedidos')} className="mk-vback">
            <Icon name="chevronLeft" size={14} /> Volver a pedidos
          </button>
          <h1>Tracking del pedido</h1>
          <p>
            Pedido <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{pedido.id.slice(0, 8)}</code>
            {' · '}para {pedido.nombre_comprador}
          </p>
        </div>
      </div>

      {/* Datos del comprador */}
      <div className="mk-vpanel">
        <div className="mk-vpanel-head">
          <div><h3>Datos del comprador</h3></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Nombre</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{pedido.nombre_comprador}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Email</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', wordBreak: 'break-all' }}>{pedido.email_comprador}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Teléfono</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              {pedido.telefono || <span style={{ color: '#B91C1C' }}>⚠ no registrado</span>}
              {pedido.telefono && telNormalizado && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted-2)' }}>→ +{telNormalizado}</span>
              )}
              {pedido.telefono && !telNormalizado && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#B91C1C' }}>⚠ formato inválido</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Dirección</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{pedido.direccion_entrega || '—'}</div>
          </div>
          {trackingCode && (
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Código de tracking</div>
                <code style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--brand-700)' }}>{trackingCode}</code>
              </div>
              <a href={`/tracking/${trackingCode}`} target="_blank" rel="noopener noreferrer" className="mk-btn mk-btn-ghost">
                <Icon name="eye" size={14} /> Ver como comprador
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Form nuevo evento */}
      <div className="mk-vpanel">
        <div className="mk-vpanel-head"><div><h3>Registrar nuevo evento</h3></div></div>

        <div className="mk-vform">
          <div className="mk-vfield">
            <label>Nuevo estado</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {ESTADOS.map((s) => {
                const m = ESTADO_META[s]
                const active = nuevoEstado === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNuevoEstado(s)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 11,
                      border: active ? '2px solid var(--brand)' : '1.5px solid var(--line)',
                      background: active ? 'var(--brand-tint)' : '#fff',
                      color: active ? 'var(--brand-700)' : 'var(--ink)',
                      fontSize: 12.5,
                      fontWeight: active ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{m.icono}</span>
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mk-vfield-row">
            <div className="mk-vfield">
              <label htmlFor="transportista">Transportista</label>
              <select
                id="transportista"
                value={transportista}
                onChange={(e) => setTransportista(e.target.value as Transportista)}
                disabled={saving}
              >
                {TRANSPORTISTAS.map((t) => {
                  const m = TRANSPORTISTA_META[t]
                  return (
                    <option key={t} value={t}>{m.icono} {m.label}</option>
                  )
                })}
              </select>
              <span className="mk-vfield-hint">{TRANSPORTISTA_META[transportista].descripcion}</span>
            </div>
            <div className="mk-vfield">
              <label htmlFor="numero_guia">
                Número de guía
                {!TRANSPORTISTA_META[transportista].tieneTrackingExterno && (
                  <span style={{ color: 'var(--muted-2)', fontWeight: 500 }}> opcional</span>
                )}
              </label>
              <input
                id="numero_guia"
                type="text"
                value={numeroGuia}
                onChange={(e) => setNumeroGuia(e.target.value)}
                placeholder="Ej: 0011235813"
                disabled={saving}
                maxLength={50}
              />
              {numeroGuia && linkTrackingExterno(transportista, numeroGuia) && (
                <a
                  href={linkTrackingExterno(transportista, numeroGuia)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11.5, color: 'var(--brand-700)', fontWeight: 700, textDecoration: 'underline', marginTop: 4, display: 'inline-block' }}
                >
                  Probar tracking oficial ↗
                </a>
              )}
            </div>
          </div>

          <div className="mk-vfield">
            <label htmlFor="notas">
              Notas <span style={{ color: 'var(--muted-2)', fontWeight: 500 }}>visible para el comprador</span>
            </label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej: enviado vía Olva Courier, guía 1234567. Llega en 2-3 días hábiles."
              disabled={saving}
            />
            <span className="mk-vfield-counter">{notas.length}/500</span>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="button" onClick={submit} disabled={saving} className="mk-btn mk-btn-primary" style={{ padding: '13px 22px', fontSize: 15 }}>
            {saving ? 'Guardando…' : <><Icon name="check" size={17} /> Guardar evento</>}
          </button>
        </div>
      </div>

      {/* Acción WhatsApp */}
      {eventoParaNotificar && (
        <div className="mk-vpanel" style={{ background: 'var(--green-tint)', borderColor: 'rgba(19,122,75,.3)' }}>
          <div className="mk-vpanel-head">
            <div>
              <h3 style={{ color: 'var(--green)' }}>
                <Icon name="message" size={17} stroke={1.9} /> Notificar al comprador por WhatsApp
              </h3>
              <span className="mk-vpanel-sub">
                Al hacer click se abre WhatsApp con el mensaje pre-cargado. Se envía desde <strong>tu</strong> WhatsApp.
              </span>
            </div>
          </div>
          {waMessage && (
            <pre style={{ background: '#fff', border: '1px solid #BFE0CD', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--ink)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {waMessage}
            </pre>
          )}
          {waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="mk-btn" style={{ background: 'var(--green)', color: '#fff', alignSelf: 'flex-start' }}>
              <Icon name="message" size={16} stroke={1.8} /> Abrir WhatsApp con mensaje
            </a>
          ) : (
            <p style={{ fontSize: 12.5, color: '#B91C1C', fontWeight: 700, margin: 0 }}>
              ⚠ No hay teléfono válido del comprador. Pedí su número y registralo en el pedido.
            </p>
          )}
        </div>
      )}

      {/* Historial */}
      <div className="mk-vpanel" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <h3>Historial de tracking</h3>
          <span className="mk-vpanel-sub">{eventos.length} evento{eventos.length === 1 ? '' : 's'}</span>
        </div>
        {eventos.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--muted-2)' }}>
            Todavía no hay eventos registrados. Creá el primero arriba.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {[...eventos].reverse().map((e) => {
              const m = ESTADO_META[e.estado as EstadoTracking] ?? ESTADO_META.preparando
              const fecha = new Date(e.created_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
              return (
                <li key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 24px', borderTop: '1px solid var(--line-2)' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{m.icono}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{m.label}</p>
                    {e.notas && <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{e.notas}</p>}
                    <p style={{ fontSize: 11.5, color: 'var(--muted-2)', margin: '4px 0 0' }}>{fecha}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
