'use client'
import { useState } from 'react'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgoqbdeo'

type Tipo = 'sugerencia' | 'reclamo' | 'consulta' | 'vendedor'

const TIPO_LABEL: Record<Tipo, string> = {
  sugerencia: 'Sugerencia',
  reclamo: 'Reclamo',
  consulta: 'Consulta general',
  vendedor: 'Quiero vender en Merkao',
}

export default function ContactForm() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState<Tipo>('consulta')
  const [mensaje, setMensaje] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setNombre('')
    setEmail('')
    setTipo('consulta')
    setMensaje('')
    setSent(false)
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setError(null)

    const nombreT = nombre.trim()
    const emailT = email.trim()
    const mensajeT = mensaje.trim()

    if (nombreT.length < 2) {
      setError('Tu nombre debe tener al menos 2 caracteres.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailT)) {
      setError('Por favor ingresa un email válido.')
      return
    }
    if (mensajeT.length < 10) {
      setError('Tu mensaje debe tener al menos 10 caracteres.')
      return
    }
    if (mensajeT.length > 4000) {
      setError('Tu mensaje supera el límite de 4000 caracteres.')
      return
    }

    setSending(true)
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreT,
          email: emailT,
          tipo: TIPO_LABEL[tipo],
          mensaje: mensajeT,
          _subject: `Mensaje desde Merkao.org - ${TIPO_LABEL[tipo]}`,
          _replyto: emailT,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> }
      if (!res.ok) {
        const msg = data.errors?.[0]?.message ?? `Error ${res.status}`
        throw new Error(msg)
      }
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar tu mensaje.'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#dcfce7' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-lg font-black mb-2" style={{ color: '#131921' }}>¡Mensaje enviado!</h3>
        <p className="text-sm text-gray-600 mb-5">
          Gracias por escribirnos. Te responderemos a <span className="font-semibold">{email}</span> lo antes posible.
        </p>
        <button
          type="button"
          onClick={reset}
          className="font-bold px-6 py-2.5 rounded-xl text-sm transition hover:brightness-110"
          style={{ backgroundColor: '#FF9900', color: '#131921' }}
        >
          Enviar otro mensaje
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-nombre" className="block text-xs font-bold text-gray-700 mb-1.5">
            Nombre
          </label>
          <input
            id="cf-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={100}
            required
            placeholder="¿Cómo te llamas?"
            disabled={sending}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="cf-email" className="block text-xs font-bold text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="cf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={150}
            required
            placeholder="tu@correo.com"
            disabled={sending}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cf-tipo" className="block text-xs font-bold text-gray-700 mb-1.5">
          Tipo de mensaje
        </label>
        <select
          id="cf-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Tipo)}
          disabled={sending}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-white disabled:opacity-60"
        >
          <option value="sugerencia">{TIPO_LABEL.sugerencia}</option>
          <option value="reclamo">{TIPO_LABEL.reclamo}</option>
          <option value="consulta">{TIPO_LABEL.consulta}</option>
          <option value="vendedor">{TIPO_LABEL.vendedor}</option>
        </select>
      </div>

      <div>
        <label htmlFor="cf-mensaje" className="block text-xs font-bold text-gray-700 mb-1.5">
          Mensaje
        </label>
        <textarea
          id="cf-mensaje"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          placeholder="Contanos en qué te podemos ayudar…"
          disabled={sending}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-y min-h-[120px] disabled:opacity-60"
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">{mensaje.length}/4000</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full font-bold px-6 py-3 rounded-xl text-sm transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        style={{ backgroundColor: '#FF9900', color: '#131921' }}
      >
        {sending && (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {sending ? 'Enviando…' : 'Enviar mensaje'}
      </button>
      <p className="text-[11px] text-gray-500 text-center">
        Te responderemos al email que ingresaste. No compartimos tus datos con terceros.
      </p>
    </form>
  )
}
