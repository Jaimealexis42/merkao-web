'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { Icon } from '@/lib/icons'

const BANCOS = ['BCP', 'Interbank', 'BBVA', 'Scotiabank', 'BanBif', 'Caja Cusco', 'Otro']

type DatosPago = {
  nombre_titular: string
  banco: string
  num_cuenta: string
  cci: string
  yape_plin: string
}

const EMPTY: DatosPago = {
  nombre_titular: '',
  banco: '',
  num_cuenta: '',
  cci: '',
  yape_plin: '',
}

export default function DatosPagoPage() {
  const { user } = useAuth()

  const [form, setForm]           = useState<DatosPago>(EMPTY)
  const [loading, setLoading]     = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('perfiles')
      .select('nombre_titular, banco, num_cuenta, cci, yape_plin')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            nombre_titular: data.nombre_titular ?? '',
            banco:          data.banco          ?? '',
            num_cuenta:     data.num_cuenta     ?? '',
            cci:            data.cci            ?? '',
            yape_plin:      data.yape_plin      ?? '',
          })
        }
        setLoading(false)
      })
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setGuardando(true)
    setError('')
    setExito(false)

    const { error: sbError } = await supabase.from('perfiles').upsert(
      {
        id:             user.id,
        nombre_titular: form.nombre_titular.trim() || null,
        banco:          form.banco          || null,
        num_cuenta:     form.num_cuenta.trim() || null,
        cci:            form.cci.trim()        || null,
        yape_plin:      form.yape_plin.trim()  || null,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    if (sbError) {
      setError('No se pudieron guardar los datos: ' + sbError.message)
    } else {
      setExito(true)
      setTimeout(() => setExito(false), 4000)
    }
    setGuardando(false)
  }

  if (loading) {
    return <div className="mk-vempty"><p style={{ color: 'var(--muted-2)' }}>Cargando datos de pago…</p></div>
  }

  return (
    <>
      <div className="mk-vmain-head">
        <div>
          <h1>Datos de pago</h1>
          <p>Agrega tu cuenta bancaria y/o Yape/Plin para que Merkao pueda transferirte tus ingresos.</p>
        </div>
      </div>

      {/* Aviso escrow */}
      <div className="mk-vpanel" style={{ background: 'var(--navy-tint)', borderColor: 'rgba(43,108,176,.3)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Icon name="lock" size={22} stroke={1.8} style={{ color: 'var(--navy)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>¿Cómo funciona el pago?</p>
            <p style={{ fontSize: 13, color: 'var(--ink)', margin: '4px 0 0', lineHeight: 1.5 }}>
              Cuando el comprador confirma la recepción de su pedido, el monto en escrow se libera y Merkao
              lo transfiere a los datos que registras aquí en un plazo de 1–2 días hábiles.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>

        {/* Titular */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head"><div><h3>Titular de la cuenta</h3></div></div>
          <div className="mk-vfield">
            <label>Nombre completo del titular <span className="req">*</span></label>
            <input
              type="text"
              name="nombre_titular"
              value={form.nombre_titular}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez García"
              required
            />
          </div>
        </div>

        {/* Bancaria */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head"><div><h3>Cuenta bancaria</h3></div></div>
          <div className="mk-vform">
            <div className="mk-vfield">
              <label>Banco</label>
              <select name="banco" value={form.banco} onChange={handleChange}>
                <option value="">— Selecciona tu banco —</option>
                {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="mk-vfield">
              <label>Número de cuenta</label>
              <input
                type="text"
                name="num_cuenta"
                value={form.num_cuenta}
                onChange={handleChange}
                placeholder="Ej. 191-12345678-0-12"
                inputMode="numeric"
                style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}
              />
            </div>
            <div className="mk-vfield">
              <label>CCI — Código de Cuenta Interbancario</label>
              <input
                type="text"
                name="cci"
                value={form.cci}
                onChange={handleChange}
                placeholder="20 dígitos — Ej. 00219100123456780112"
                inputMode="numeric"
                maxLength={20}
                style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}
              />
              <span className="mk-vfield-hint">Puedes ver tu CCI en la app de tu banco o en &ldquo;Mis cuentas&rdquo;.</span>
            </div>
          </div>
        </div>

        {/* Yape / Plin */}
        <div className="mk-vpanel">
          <div className="mk-vpanel-head"><div><h3>Yape / Plin</h3></div></div>
          <div className="mk-vfield">
            <label>Número de celular registrado en Yape o Plin</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', border: '1.5px solid var(--line)', borderRadius: 9, background: 'var(--bg)', color: 'var(--muted)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                +51
              </span>
              <input
                type="tel"
                name="yape_plin"
                value={form.yape_plin}
                onChange={handleChange}
                placeholder="9XX XXX XXX"
                inputMode="numeric"
                maxLength={9}
                style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}
              />
            </div>
            <span className="mk-vfield-hint">
              Solo para montos menores a S/ 2,000. Para importes mayores se usará transferencia bancaria.
            </span>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mk-vpanel" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#B91C1C' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
              <Icon name="lock" size={18} /> {error}
            </div>
          </div>
        )}
        {exito && (
          <div className="mk-vpanel" style={{ background: 'var(--green-tint)', borderColor: 'var(--green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)' }}>
              <Icon name="checkCircle" size={18} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Datos de pago guardados correctamente.</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={guardando} className="mk-btn mk-btn-primary" style={{ padding: '13px 22px', fontSize: 15 }}>
          {guardando ? 'Guardando…' : <><Icon name="check" size={17} /> Guardar datos de pago</>}
        </button>
        <p style={{ fontSize: 12, color: 'var(--muted-2)', textAlign: 'center', margin: 0 }}>
          Tu información bancaria está protegida y solo se usa para realizar pagos a tu cuenta.
        </p>
      </form>
    </>
  )
}
