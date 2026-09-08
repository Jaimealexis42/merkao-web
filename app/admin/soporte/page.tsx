'use client'
import { useEffect, useState } from 'react'
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

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminSoportePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [threads, setThreads]       = useState<Thread[]>([])
  const [selected, setSelected]     = useState<Thread | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [reply, setReply]           = useState('')
  const [sending, setSending]       = useState(false)
  const [sendError, setSendError]   = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login?redirect=/admin/soporte'); return }
    if (!isAdminEmail(user.email)) { router.replace('/'); return }

    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Sesión expirada.'); setLoading(false); return }

      const res = await fetch('/api/soporte/threads', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json() as { threads?: Thread[]; error?: string }
      if (cancelled) return
      if (!res.ok) { setError(json.error ?? 'Error cargando.'); setLoading(false); return }
      setThreads(json.threads ?? [])
      if (json.threads?.[0]) setSelected(json.threads[0])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [authLoading, user, router])

  const enviarRespuesta = async () => {
    const msg = reply.trim()
    if (!msg || sending || !selected) return
    setSending(true)
    setSendError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
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

  if (authLoading) return <div style={{ padding: 32 }}>Verificando sesión…</div>
  if (!isAdminEmail(user?.email)) return null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', color: '#0b1220' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Soporte — mensajes de vendedores</h1>
        <p style={{ margin: '4px 0 0', color: '#52607a' }}>Panel admin · {user?.email}</p>
      </header>

      {loading ? (
        <div style={{ padding: 24, background: '#f4f6fb', borderRadius: 12 }}>Cargando mensajes…</div>
      ) : error ? (
        <div style={{ padding: 24, background: '#fde9ea', borderRadius: 12, color: '#9a1c25' }}>{error}</div>
      ) : threads.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#8896aa', background: '#f4f6fb', borderRadius: 12 }}>
          Ningún vendedor ha escrito todavía.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Thread list */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            {threads.map((t) => {
              const isActive = selected?.vendedor_id === t.vendedor_id
              return (
                <button
                  key={t.vendedor_id}
                  onClick={() => setSelected(t)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '14px 16px',
                    background: isActive ? '#eff6ff' : '#fff',
                    borderBottom: '1px solid #e2e8f0', cursor: 'pointer', border: 'none',
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
            })}
          </div>

          {/* Thread detail */}
          {selected ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <strong>{selected.nombre}</strong>
                <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>{selected.vendedor_id}</span>
              </div>

              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 320, maxHeight: 480, overflowY: 'auto' }}>
                {selected.mensajes.map((m) => {
                  const esVendedor = m.autor === 'vendedor'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: esVendedor ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '72%',
                        background: esVendedor ? '#f1f5f9' : '#2563eb',
                        color: esVendedor ? '#0b1220' : '#fff',
                        borderRadius: esVendedor ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                        padding: '10px 14px',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, opacity: .7 }}>
                          {esVendedor ? selected.nombre : 'Merkao (tú)'}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.texto}</p>
                        <div style={{ fontSize: 11, marginTop: 4, opacity: .6, textAlign: esVendedor ? 'left' : 'right' }}>
                          {fmtFecha(m.created_at)}
                          {!esVendedor && (m.leido ? ' · leído' : ' · no leído')}
                        </div>
                      </div>
                    </div>
                  )
                })}
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
