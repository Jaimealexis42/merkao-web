'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { Icon } from '@/lib/icons'

type Mensaje = {
  id: string
  autor: 'vendedor' | 'admin'
  texto: string
  leido: boolean
  created_at: string
}

function fmtHora(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function SoportePage() {
  const { user } = useAuth()
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const cargar = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setLoading(false); return }

    const res = await fetch('/api/soporte', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json() as { mensajes?: Mensaje[]; error?: string }
    setMensajes(json.mensajes ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    cargar()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviar = async () => {
    const msg = texto.trim()
    if (!msg || sending) return
    setSending(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setSending(false); return }

    const res = await fetch('/api/soporte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ texto: msg }),
    })
    const json = await res.json() as { mensaje?: Mensaje; error?: string }
    if (!res.ok || !json.mensaje) {
      setError(json.error ?? 'Error al enviar.')
    } else {
      setTexto('')
      setMensajes((prev) => [...prev, json.mensaje!])
    }
    setSending(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <h1>Soporte</h1>
          <p>Escríbenos si tienes alguna duda o problema con tu cuenta o tus productos.</p>
        </div>
      </div>

      <div className="mk-vpanel" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 12px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 360, maxHeight: 540 }}>
          {loading ? (
            <p style={{ color: 'var(--muted-2)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>Cargando mensajes…</p>
          ) : mensajes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 60, color: 'var(--muted-2)' }}>
              <Icon name="message" size={36} stroke={1.4} />
              <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 300 }}>
                Aún no has enviado ningún mensaje. Escríbenos cualquier duda y te respondemos a la brevedad.
              </p>
            </div>
          ) : (
            mensajes.map((m) => {
              const esMio = m.autor === 'vendedor'
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: esMio ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '72%',
                    background: esMio ? 'var(--brand)' : '#f1f5f9',
                    color: esMio ? '#fff' : 'var(--ink)',
                    borderRadius: esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '10px 14px',
                  }}>
                    {!esMio && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', marginBottom: 3 }}>Merkao Soporte</div>
                    )}
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.texto}</p>
                    <div style={{ fontSize: 11, marginTop: 4, opacity: .65, textAlign: esMio ? 'right' : 'left' }}>
                      {fmtHora(m.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--line-2)', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fafbfc' }}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribe tu mensaje… (Enter para enviar)"
            rows={2}
            style={{
              flex: 1, resize: 'none', border: '1px solid var(--line-2)', borderRadius: 10,
              padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              lineHeight: 1.5,
            }}
            disabled={sending}
          />
          <button
            onClick={enviar}
            disabled={sending || !texto.trim()}
            className="mk-btn mk-btn-primary"
            style={{ flexShrink: 0, height: 42 }}
          >
            {sending ? '…' : <Icon name="arrowRight" size={18} />}
          </button>
        </div>

        {error && (
          <p style={{ margin: '0 16px 12px', fontSize: 13, color: '#c0392b' }}>{error}</p>
        )}
      </div>

      <div className="mk-vpanel" style={{ background: '#f8faff', borderColor: '#dbeafe' }}>
        <p style={{ fontSize: 13, color: '#3b5fb5', margin: 0 }}>
          Respondemos de lunes a viernes en horario de oficina. Para urgencias escríbenos directamente a{' '}
          <a href="mailto:merkao.org@gmail.com" style={{ color: '#2563eb', fontWeight: 600 }}>merkao.org@gmail.com</a>.
        </p>
      </div>
    </>
  )
}
