'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// El layout de /admin ya exige sesión de administrador; la API la vuelve a validar.

type Reclamo = {
  id: string
  codigo: string
  tipo: string
  estado: string
  fecha: string
  vence: string
  restantes: number
  respondido: string | null
  consumidor_nombre: string
  consumidor_email: string
  bien_descripcion: string
  detalle: string
  pedido_consumidor: string
  respuesta: string | null
}

type Datos = { hoy: string; reclamos: Reclamo[] }

const fmt = (f: string) => f.split('-').reverse().join('/')
const campo: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit' }
const texto: React.CSSProperties = { fontSize: 14, whiteSpace: 'pre-wrap' }

async function api(init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin/reclamos', {
    ...init,
    headers: { Authorization: 'Bearer ' + (session?.access_token ?? ''), 'Content-Type': 'application/json' },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error ' + res.status)
  return json
}

function Formulario({ reclamo, hoy, alGuardar }: { reclamo: Reclamo; hoy: string; alGuardar: () => void }) {
  const [fecha, setFecha] = useState(hoy)
  const [respuesta, setRespuesta] = useState('')
  const [estado, setEstado] = useState('resuelto')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await api({ method: 'POST', body: JSON.stringify({ id: reclamo.id, fecha, respuesta, estado }) })
      alGuardar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} style={{ display: 'grid', gap: 10, marginTop: 14 }}>
      <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
        Esto solo registra la respuesta. No envía ningún correo: respóndele antes a {reclamo.consumidor_email}.
      </p>
      <label style={{ fontSize: 13 }}>
        Fecha en que respondiste{' '}
        <input type="date" required min={reclamo.fecha} max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} style={campo} />
      </label>
      <label style={{ fontSize: 13 }}>
        Resultado{' '}
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={campo}>
          <option value="resuelto">Resuelto</option>
          <option value="desestimado">Desestimado</option>
        </select>
      </label>
      <textarea
        required maxLength={5000} rows={4} value={respuesta} onChange={(e) => setRespuesta(e.target.value)}
        placeholder="Respuesta que enviaste al consumidor" aria-label="Respuesta" style={campo}
      />
      {error && <p style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>{error}</p>}
      <button disabled={guardando} style={{ ...campo, background: '#2563eb', color: '#fff', border: 0, fontWeight: 700, cursor: 'pointer', justifySelf: 'start' }}>
        {guardando ? 'Guardando…' : 'Registrar respuesta'}
      </button>
    </form>
  )
}

export default function ReclamosPage() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    api().then(setDatos).catch((e: Error) => setError(e.message))
  }, [version])

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 18px' }}>Libro de reclamaciones</h1>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {!datos && !error && <p>Cargando…</p>}
      {datos?.reclamos.length === 0 && <p>No hay reclamos registrados.</p>}
      {datos?.reclamos.map((r) => (
        <article key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <strong>{r.codigo} · {r.tipo.toLowerCase()} · {fmt(r.fecha)}</strong>
            {r.respondido ? (
              <span style={{ color: '#15803d', fontSize: 13 }}>Respondido el {fmt(r.respondido)} ({r.estado})</span>
            ) : (
              <span style={{ color: r.restantes < 0 ? '#b91c1c' : '#92400e', fontSize: 13, fontWeight: 700 }}>
                {r.restantes < 0 ? 'Vencido el ' : 'Quedan ' + r.restantes + ' días hábiles · vence el '}{fmt(r.vence)}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#475569' }}>{r.consumidor_nombre} · {r.consumidor_email}</p>
          <p style={texto}><b>Bien:</b> {r.bien_descripcion}</p>
          <p style={texto}><b>Detalle:</b> {r.detalle}</p>
          <p style={texto}><b>Pide:</b> {r.pedido_consumidor}</p>
          {r.respondido
            ? <p style={texto}><b>Respuesta:</b> {r.respuesta}</p>
            : <Formulario reclamo={r} hoy={datos.hoy} alGuardar={() => setVersion((v) => v + 1)} />}
        </article>
      ))}
    </main>
  )
}
