'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { isAdminEmail } from '@/lib/admin'

type Mensaje = {
  id: string
  autor: 'vendedor' | 'admin'
  texto: string
  leido: boolean
  created_at: string
}

type Thread = {
  vendedor_id: string
  nombre: string
  mensajes: Mensaje[]
  nuevo: boolean
  ultimo: string
  ultimo_at: string
}

type Vendedor = { id: string; nombre: string }

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function ThreadBubble({ m, nombre }: { m: Mensaje; nombre: string }) {
  const esVendedor = m.autor === 'vendedor'
  return (
    <div style={{ display: 'flex', justifyContent: esVendedor ? 'flex-start' : 'flex-end' }}>
      <div style={{
        maxWidth: '72%',
        background: esVendedor ? '#f1f5f9' : '#2563eb',
        color: esVendedor ? '#0b1220' : '#fff',
        borderRadius: esVendedor ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
        padding: '10px 14px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, opacity: .7 }}>
          {esVendedor ? nombre : 'Merkao (tú)'}
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.texto}</p>
        <div style={{ fontSize: 11, marginTop: 4, opacity: .6, textAlign: esVendedor ? 'left' : 'right' }}>
          {fmtFecha(m.created_at)}
          {!esVendedor && (m.leido ? ' · leído' : ' · no leído')}
        </div>
      </div>
    </div>
  )
}

export default function AdminSoportePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [threads, setThreads]       = useState<Thread[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [selected, setSelected]     = useState<Thread | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Reply to existing thread
  const [reply, setReply]         = useState('')
  const [sending, setSending]     = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // New conversation
  const [nuevoVid, setNuevoVid]       = useState('')
  const [nuevoTexto, setNuevoTexto]   = useState('')
  const [iniciando, setIniciando]     = useState(false)
  const [iniciarError, setIniciarError] = useState<string | null>(null)
  const [showNuevo, setShowNuevo]     = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  // Load threads + vendedores list
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login?redirect=/admin/soporte'); return }
    if (!isAdminEmail(user.email)) { router.replace('/'); return }

    let cancelled = false
    ;(async () => {
      const token = await getToken()
      if (!token) { setError('Sesión expirada.'); setLoading(false); return }

      const hdrs = { Authorization: `Bearer ${token}` }
      const [threadsRes, vendRes] = await Promise.all([
        fetch('/api/soporte/threads', { headers: hdrs }),
        fetch('/api/soporte/vendedores', { headers: hdrs }),
      ])
      if (cancelled) return

      const tj = await threadsRes.json() as { threads?: Thread[]; error?: string }
      const vj = await vendRes.json() as { vendedores?: Vendedor[]; error?: string }

      if (!threadsRes.ok) { setError(tj.error ?? 'Error cargando.'); setLoading(false); return }

      const loadedThreads = tj.threads ?? []
      setThreads(loadedThreads)
      setVendedores(vj.vendedores ?? [])

      // Auto-select first thread; or open new conversation form if no threads
      if (loadedThreads[0]) {
        setSelected(loadedThreads[0])
      } else {
        setShowNuevo(true)
      }

      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [authLoading, user, router])

  // Scroll to bottom whenever selected thread messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.mensajes.length])

  const enviarRespuesta = async () => {
    const msg = reply.trim()
    if (!msg || sending || !selected) return
    setSending(true)
    setSendError(null)

    const token = await getToken()
    if (!token) { setSending(false); return }

    const res = await fetch('/api/soporte/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendedor_id: selected.vendedor_id, texto: msg }),
    })
    const json = await res.json() as { mensaje?: Mensaje; error?: string }
    if (!res.ok || !json.mensaje) {
      setSendError(json.error ?? 'Error al enviar.')
    } else {
      setReply('')
      const newMsg = json.mensaje!
      setThreads((prev) =>
        prev.map((t) =>
          t.vendedor_id === selected.vendedor_id
            ? { ...t, mensajes: [...t.mensajes, newMsg], nuevo: false, ultimo: newMsg.texto, ultimo_at: newMsg.created_at }
            : t,
        ),
      )
      setSelected((prev) =>
        prev ? { ...prev, mensajes: [...prev.mensajes, newMsg], nuevo: false } : prev,
      )
    }
    setSending(false)
  }

  const iniciarConversacion = async () => {
    const msg = nuevoTexto.trim()
    if (!nuevoVid || !msg || iniciando) return
    setIniciando(true)
    setIniciarError(null)

    const token = await getToken()
    if (!token) { setIniciando(false); return }

    const res = await fetch('/api/soporte/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendedor_id: nuevoVid, texto: msg }),
    })
    const json = await res.json() as { mensaje?: Mensaje; error?: string }
    if (!res.ok || !json.mensaje) {
      setIniciarError(json.error ?? 'Error al enviar.')
      setIniciando(false)
      return
    }

    const newMsg = json.mensaje!
    const vendNombre = vendedores.find((v) => v.id === nuevoVid)?.nombre ?? `Vendedor ${nuevoVid.slice(0, 8)}`

    // Add to or update thread list
    setThreads((prev) => {
      const existing = prev.find((t) => t.vendedor_id === nuevoVid)
      if (existing) {
        return prev.map((t) =>
          t.vendedor_id === nuevoVid
            ? { ...t, mensajes: [...t.mensajes, newMsg], nuevo: false, ultimo: newMsg.texto, ultimo_at: newMsg.created_at }
            : t,
        )
      }
      const newThread: Thread = {
        vendedor_id: nuevoVid,
        nombre: vendNombre,
        mensajes: [newMsg],
        nuevo: false,
        ultimo: newMsg.texto,
        ultimo_at: newMsg.created_at,
      }
      return [newThread, ...prev]
    })

    // Select the thread and close new form
    setSelected((prev) => {
      const base = prev?.vendedor_id === nuevoVid
        ? { ...prev!, mensajes: [...prev!.mensajes, newMsg], nuevo: false }
        : { vendedor_id: nuevoVid, nombre: vendNombre, mensajes: [newMsg], nuevo: false, ultimo: newMsg.texto, ultimo_at: newMsg.created_at }
      return base
    })

    setNuevoVid('')
    setNuevoTexto('')
    setShowNuevo(false)
    setIniciando(false)
  }

  if (authLoading) return <div style={{ padding: 32, fontFamily: 'system-ui' }}>Verificando sesión…</div>
  if (!isAdminEmail(user?.email)) return null

  const THREAD_COL: React.CSSProperties = {
    border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  }

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', color: '#0b1220' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Soporte — mensajes de vendedores</h1>
          <p style={{ margin: '4px 0 0', color: '#52607a' }}>Panel admin · {user?.email}</p>
        </div>
        <button
          onClick={() => { setShowNuevo(true); setSelected(null) }}
          style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          + Nueva conversación
        </button>
      </header>

      {loading ? (
        <div style={{ padding: 24, background: '#f4f6fb', borderRadius: 12 }}>Cargando…</div>
      ) : error ? (
        <div style={{ padding: 24, background: '#fde9ea', borderRadius: 12, color: '#9a1c25' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Left: thread list */}
          <div style={THREAD_COL}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '.06em' }}>
              CONVERSACIONES {threads.length > 0 && `(${threads.length})`}
            </div>

            {threads.length === 0 ? (
              <div style={{ padding: '24px 16px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                Sin conversaciones aún.<br />Usa «Nueva conversación» para escribir primero.
              </div>
            ) : (
              threads.map((t) => {
                const isActive = !showNuevo && selected?.vendedor_id === t.vendedor_id
                return (
                  <button
                    key={t.vendedor_id}
                    onClick={() => { setSelected(t); setShowNuevo(false) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '13px 14px',
                      background: isActive ? '#eff6ff' : '#fff',
                      borderBottom: '1px solid #e2e8f0', cursor: 'pointer',
                      border: 'none', outline: 'none',
                      borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <strong style={{ fontSize: 14, color: '#0b1220' }}>{t.nombre}</strong>
                      {t.nuevo && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>NUEVO</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.ultimo}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{fmtFecha(t.ultimo_at)}</div>
                  </button>
                )
              })
            )}
          </div>

          {/* Right: new conversation form OR selected thread */}
          {showNuevo ? (
            <div style={THREAD_COL}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <strong>Nueva conversación</strong>
                <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>Escribe primero a un vendedor</span>
              </div>

              <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Vendedor
                  </label>
                  <select
                    value={nuevoVid}
                    onChange={(e) => setNuevoVid(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', outline: 'none' }}
                  >
                    <option value="">— Selecciona un vendedor —</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                  {vendedores.length === 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>No hay vendedores con tienda registrada.</p>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Mensaje
                  </label>
                  <textarea
                    value={nuevoTexto}
                    onChange={(e) => setNuevoTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); iniciarConversacion() } }}
                    placeholder="Escribe el primer mensaje para el vendedor…"
                    rows={4}
                    style={{ width: '100%', resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    disabled={iniciando}
                  />
                </div>

                {iniciarError && (
                  <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{iniciarError}</p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={iniciarConversacion}
                    disabled={iniciando || !nuevoVid || !nuevoTexto.trim()}
                    style={{
                      padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none',
                      borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      opacity: (iniciando || !nuevoVid || !nuevoTexto.trim()) ? .5 : 1,
                    }}
                  >
                    {iniciando ? 'Enviando…' : 'Enviar mensaje'}
                  </button>
                  {threads.length > 0 && (
                    <button
                      onClick={() => { setShowNuevo(false); setSelected(threads[0]) }}
                      style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                  El vendedor verá un indicador en su panel y recibirá un correo con el aviso.
                </p>
              </div>
            </div>
          ) : selected ? (
            <div style={THREAD_COL}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <strong>{selected.nombre}</strong>
                <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>{selected.vendedor_id}</span>
              </div>

              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 320, maxHeight: 480, overflowY: 'auto' }}>
                {selected.mensajes.map((m) => (
                  <ThreadBubble key={m.id} m={m} nombre={selected.nombre} />
                ))}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarRespuesta() } }}
                  placeholder="Escribe tu respuesta… (Enter para enviar)"
                  rows={2}
                  style={{ flex: 1, resize: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                  disabled={sending}
                />
                <button
                  onClick={enviarRespuesta}
                  disabled={sending || !reply.trim()}
                  style={{
                    padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none',
                    borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0,
                    opacity: (sending || !reply.trim()) ? .5 : 1,
                  }}
                >
                  {sending ? '…' : 'Responder'}
                </button>
              </div>
              {sendError && (
                <p style={{ margin: '0 16px 10px', fontSize: 13, color: '#c0392b' }}>{sendError}</p>
              )}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#8896aa', background: '#f4f6fb', borderRadius: 12 }}>
              Selecciona una conversación
            </div>
          )}
        </div>
      )}
    </div>
  )
}
