'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ESTADO_META,
  ESTADOS,
  type EstadoTracking,
  type TrackingEvento,
} from '@/lib/tracking'
import {
  TRANSPORTISTA_META,
  type Transportista,
  linkTrackingExterno,
  transportistaLabel,
  transportistaIcono,
} from '@/lib/transportistas'

interface PedidoMini {
  id: string
  nombre_comprador: string
  created_at: string
}

export default function TrackingPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const [eventos, setEventos] = useState<TrackingEvento[]>([])
  const [pedido, setPedido] = useState<PedidoMini | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!codigo) return
    ;(async () => {
      // Buscar todos los eventos con este tracking_code (uno o más)
      const { data: ev, error } = await supabase
        .from('order_tracking')
        .select('id, pedido_id, tracking_code, estado, notas, numero_guia, transportista, created_at, updated_at')
        .eq('tracking_code', codigo)
        .order('created_at', { ascending: true })

      if (error || !ev || ev.length === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setEventos(ev as TrackingEvento[])

      // Datos mínimos del pedido para personalizar header
      const pedidoId = ev[0].pedido_id
      const { data: p } = await supabase
        .from('pedidos')
        .select('id, nombre_comprador, created_at')
        .eq('id', pedidoId)
        .single()
      if (p) setPedido(p as PedidoMini)

      setLoading(false)
    })()
  }, [codigo])

  const estadoActual: EstadoTracking | null =
    eventos.length > 0 ? (eventos[eventos.length - 1].estado as EstadoTracking) : null
  const estadoIdx = estadoActual ? ESTADOS.indexOf(estadoActual) : -1

  // Envío: tomamos el evento MÁS RECIENTE que tenga número de guía, ya que el
  // vendedor puede haber empezado sin guía y agregarla cuando despachó.
  const envio = [...eventos].reverse().find((e) => e.numero_guia) ?? null
  const numeroGuia = envio?.numero_guia ?? null
  const transportista = (envio?.transportista as Transportista | null) ?? null
  const trackingLink = linkTrackingExterno(transportista, numeroGuia)
  const transportistaTieneLink = !!(transportista && TRANSPORTISTA_META[transportista as Transportista]?.tieneTrackingExterno)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Cargando seguimiento…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-5xl mb-3">📭</p>
          <p className="text-gray-700 font-bold">Código de tracking no encontrado</p>
          <p className="text-sm text-gray-400 mt-1">
            Revisá el código <code className="bg-gray-100 px-1.5 py-0.5 rounded">{codigo}</code> y volvé a intentar.
          </p>
          <a href="/" className="mt-4 inline-block text-sm underline" style={{ color: '#007185' }}>
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  const fechaPedido = pedido
    ? new Date(pedido.created_at).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#131921' }}>
        <a href="/" className="flex items-center gap-0.5 shrink-0">
          <span className="text-white text-2xl font-black tracking-tight">merkao</span>
          <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>
        <div className="flex-1" />
        <a href="/" className="text-gray-400 text-xs hover:text-white transition">← Inicio</a>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Header del pedido */}
        <div className="text-center">
          <p className="text-xs font-black tracking-widest mb-2" style={{ color: '#FF9900' }}>SEGUIMIENTO DE ENVÍO</p>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800">
            {pedido?.nombre_comprador
              ? `${pedido.nombre_comprador.split(' ')[0]}, este es tu pedido`
              : 'Estado de tu pedido'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Código: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{codigo}</code>
            {fechaPedido && <span> · realizado el {fechaPedido}</span>}
          </p>
        </div>

        {/* Estado actual destacado */}
        {estadoActual && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="text-5xl mb-2">{ESTADO_META[estadoActual].icono}</div>
            <p className="text-xs uppercase tracking-widest text-gray-400">Estado actual</p>
            <p className="text-xl font-black text-gray-800 mt-1">{ESTADO_META[estadoActual].label}</p>
            <p className="text-sm text-gray-600 mt-2">{ESTADO_META[estadoActual].desc}</p>
          </div>
        )}

        {/* Datos del envío (transportista + guía + tracking oficial) */}
        {(numeroGuia || transportista) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">{transportistaIcono(transportista)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-gray-400">Datos del envío</p>
                <p className="text-base font-black text-gray-800 mt-0.5">{transportistaLabel(transportista)}</p>
                {numeroGuia && (
                  <p className="text-xs text-gray-500 mt-1">
                    Guía:{' '}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono font-bold text-gray-800">
                      {numeroGuia}
                    </code>
                  </p>
                )}
              </div>
            </div>
            {trackingLink ? (
              <a
                href={trackingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition hover:brightness-110"
                style={{ backgroundColor: '#FF9900', color: '#131921' }}
              >
                Ver tracking oficial en {transportistaLabel(transportista)} ↗
              </a>
            ) : transportistaTieneLink && !numeroGuia ? (
              <p className="mt-3 text-xs text-gray-400">
                El vendedor aún no registró el número de guía.
              </p>
            ) : null}
          </div>
        )}

        {/* Timeline de los 4 estados con progreso */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-5">Progreso</h2>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
            <div
              className="absolute left-5 top-5 w-0.5 bg-green-400 transition-all duration-700"
              style={{ height: estadoIdx > 0 ? `${(estadoIdx / (ESTADOS.length - 1)) * 100}%` : '0%' }}
            />
            <div className="space-y-6">
              {ESTADOS.map((s, i) => {
                const completado = i <= estadoIdx
                const actual = i === estadoIdx
                const meta = ESTADO_META[s]
                return (
                  <div key={s} className="flex items-start gap-4">
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 shrink-0 transition-all ${
                        completado ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
                      } ${actual ? 'ring-4 ring-green-100 shadow-sm' : ''}`}
                    >
                      {meta.icono}
                    </div>
                    <div className="flex-1 pt-2">
                      <p className={`text-sm font-bold ${completado ? 'text-gray-800' : 'text-gray-400'}`}>
                        {meta.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${actual ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                        {meta.desc}
                      </p>
                    </div>
                    {actual && (
                      <span className="mt-2.5 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Actual
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Historial de eventos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Historial de eventos</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {eventos.length} evento{eventos.length === 1 ? '' : 's'} registrado{eventos.length === 1 ? '' : 's'}
            </p>
          </div>
          <ul className="divide-y divide-gray-50">
            {[...eventos].reverse().map((e) => {
              const meta = ESTADO_META[e.estado as EstadoTracking] ?? ESTADO_META.preparando
              const fecha = new Date(e.created_at).toLocaleString('es-PE', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
              return (
                <li key={e.id} className="px-6 py-4 flex items-start gap-3">
                  <span className="text-xl shrink-0">{meta.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{meta.label}</p>
                    {e.notas && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{e.notas}</p>}
                    <p className="text-[11px] text-gray-400 mt-1">{fecha}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="text-center text-xs text-gray-400 py-4">
          ¿Necesitas ayuda con tu pedido?{' '}
          <a href="/contacto" className="underline" style={{ color: '#007185' }}>
            Contáctanos
          </a>
        </div>
      </div>
    </div>
  )
}
