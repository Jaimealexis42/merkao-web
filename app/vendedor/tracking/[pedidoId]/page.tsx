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

interface Pedido {
  id: string
  vendedor_id: string | null
  nombre_comprador: string
  email_comprador: string
  telefono: string | null
  direccion: string | null
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
        .select('id, vendedor_id, nombre_comprador, email_comprador, telefono, direccion, estado, created_at')
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
        .select('id, pedido_id, tracking_code, estado, notas, created_at, updated_at')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: true })

      if (ev) setEventos(ev as TrackingEvento[])
      setLoading(false)
    })()
  }, [pedidoId, authLoading, user])

  const submit = async () => {
    if (!pedido || saving) return
    setError(null)
    setSaving(true)
    try {
      // Si ya hay un evento previo reutilizamos su tracking_code para
      // que el comprador siga viendo el mismo link. Si es el primero,
      // dejamos que el default lo genere (devuelve el code en `select`).
      const insertPayload: Record<string, unknown> = {
        pedido_id: pedido.id,
        estado: nuevoEstado,
        notas: notas.trim() || null,
      }
      if (eventos.length > 0) {
        insertPayload.tracking_code = eventos[0].tracking_code
      }

      const { data, error: e } = await supabase
        .from('order_tracking')
        .insert(insertPayload)
        .select('id, pedido_id, tracking_code, estado, notas, created_at, updated_at')
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
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Cargando panel…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-5xl mb-3">⚠️</p>
          <p className="text-gray-700 font-bold">Pedido no encontrado</p>
          <a href="/vendedor" className="mt-4 inline-block text-sm underline" style={{ color: '#007185' }}>
            Volver al panel
          </a>
        </div>
      </div>
    )
  }

  if (!authorized || !pedido) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-5xl mb-3">🔒</p>
          <p className="text-gray-700 font-bold">No tienes permiso</p>
          <p className="text-sm text-gray-400 mt-1">Este pedido no pertenece a tu tienda.</p>
          <a href="/vendedor" className="mt-4 inline-block text-sm underline" style={{ color: '#007185' }}>
            Volver al panel
          </a>
        </div>
      </div>
    )
  }

  const ultimoEvento = eventos[eventos.length - 1] ?? null
  const trackingCode = ultimoEvento?.tracking_code ?? null
  const telNormalizado = normalizarTelefonoPeru(pedido.telefono)

  // Link WhatsApp: si hay un evento recién insertado, generamos el mensaje
  // con su estado. Si no, usamos el último estado registrado (o nada).
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
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="sticky top-0 z-50 px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#131921' }}>
        <a href="/" className="flex items-center gap-0.5 shrink-0">
          <span className="text-white text-2xl font-black tracking-tight">merkao</span>
          <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>
        <div className="flex-1" />
        <a href="/vendedor" className="text-gray-400 text-xs hover:text-white transition">← Panel vendedor</a>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div>
          <p className="text-xs font-black tracking-widest" style={{ color: '#FF9900' }}>PANEL VENDEDOR · TRACKING</p>
          <h1 className="text-2xl font-black text-gray-800 mt-1">Actualizar estado del envío</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pedido <code className="bg-gray-100 px-1.5 py-0.5 rounded">{pedido.id.slice(0, 8)}</code>
            {' · '}para {pedido.nombre_comprador}
          </p>
        </div>

        {/* Datos del comprador */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-400">Nombre</p>
            <p className="font-bold text-gray-800">{pedido.nombre_comprador}</p>
          </div>
          <div>
            <p className="text-gray-400">Email</p>
            <p className="font-bold text-gray-800 break-all">{pedido.email_comprador}</p>
          </div>
          <div>
            <p className="text-gray-400">Teléfono</p>
            <p className="font-bold text-gray-800">
              {pedido.telefono || <span className="text-red-600">⚠️ no registrado</span>}
              {pedido.telefono && telNormalizado && (
                <span className="ml-2 text-[10px] text-gray-400">→ +{telNormalizado}</span>
              )}
              {pedido.telefono && !telNormalizado && (
                <span className="ml-2 text-[10px] text-red-500">⚠ formato inválido</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Dirección</p>
            <p className="font-bold text-gray-800">{pedido.direccion || '—'}</p>
          </div>
          {trackingCode && (
            <div className="sm:col-span-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-gray-400">Código de tracking</p>
                <code className="text-sm font-mono font-bold" style={{ color: '#007185' }}>{trackingCode}</code>
              </div>
              <a
                href={`/tracking/${trackingCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold underline shrink-0"
                style={{ color: '#007185' }}
              >
                Ver como comprador ↗
              </a>
            </div>
          )}
        </div>

        {/* Form nuevo evento */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Registrar nuevo evento</h2>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nuevo estado</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ESTADOS.map((s) => {
                const m = ESTADO_META[s]
                const active = nuevoEstado === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNuevoEstado(s)}
                    className={
                      active
                        ? 'flex flex-col items-center gap-1 rounded-xl border-2 border-orange-500 bg-orange-50 px-3 py-3 text-xs font-bold text-orange-700'
                        : 'flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-3 text-xs font-medium text-gray-700'
                    }
                  >
                    <span className="text-xl">{m.icono}</span>
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label htmlFor="notas" className="block text-xs font-bold text-gray-700 mb-1.5">
              Notas <span className="text-gray-400 font-normal">(opcional, visible para el comprador)</span>
            </label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej: enviado vía Olva Courier, guía 1234567. Llega en 2-3 días hábiles."
              disabled={saving}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-y disabled:opacity-60"
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{notas.length}/500</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full font-bold px-6 py-3 rounded-xl text-sm transition hover:brightness-110 disabled:opacity-60"
            style={{ backgroundColor: '#FF9900', color: '#131921' }}
          >
            {saving ? 'Guardando…' : '💾 Guardar evento'}
          </button>
        </div>

        {/* Acción WhatsApp */}
        {eventoParaNotificar && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-green-900 mb-2">📲 Notificar al comprador por WhatsApp</h2>
            <p className="text-xs text-green-800 mb-3">
              Al hacer click se abre WhatsApp Web/App con el mensaje pre-cargado para que lo envíes vos.
              Se envía desde <strong>tu</strong> WhatsApp — más personal y sin requerir API de Meta.
            </p>
            {waMessage && (
              <pre className="bg-white border border-green-200 rounded-xl p-3 text-xs text-gray-700 whitespace-pre-wrap mb-3">
                {waMessage}
              </pre>
            )}
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-green-600 hover:bg-green-700 text-white transition"
              >
                💬 Abrir WhatsApp con mensaje
              </a>
            ) : (
              <p className="text-xs text-red-700 font-bold">
                ⚠️ No hay teléfono válido del comprador. Pedí su número y registralo en el pedido.
              </p>
            )}
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Historial de tracking</h2>
            <p className="text-xs text-gray-500 mt-0.5">{eventos.length} evento{eventos.length === 1 ? '' : 's'}</p>
          </div>
          {eventos.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Todavía no hay eventos registrados. Creá el primero arriba.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {[...eventos].reverse().map((e) => {
                const m = ESTADO_META[e.estado as EstadoTracking] ?? ESTADO_META.preparando
                const fecha = new Date(e.created_at).toLocaleString('es-PE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
                return (
                  <li key={e.id} className="px-6 py-4 flex items-start gap-3">
                    <span className="text-xl shrink-0">{m.icono}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{m.label}</p>
                      {e.notas && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{e.notas}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">{fecha}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
