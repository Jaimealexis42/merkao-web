'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

const BANCOS = [
  'BCP',
  'Interbank',
  'BBVA',
  'Scotiabank',
  'BanBif',
  'Caja Cusco',
  'Otro',
]

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

  const [form, setForm]         = useState<DatosPago>(EMPTY)
  const [loading, setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]       = useState(false)
  const [error, setError]       = useState('')

  /* ── Cargar datos guardados ── */
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

  /* ── Guardar ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setGuardando(true)
    setError('')
    setExito(false)

    const { error: sbError } = await supabase
      .from('perfiles')
      .upsert(
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
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400 text-sm animate-pulse">Cargando datos de pago...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-black text-gray-800">Datos de pago</h1>
        <p className="text-sm text-gray-500 mt-1">
          Agrega tu cuenta bancaria y/o Yape/Plin para que Merkao pueda transferirte tus ingresos.
        </p>
      </div>

      {/* Aviso escrow */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <span className="text-2xl shrink-0">🔒</span>
        <div className="text-xs text-blue-700">
          <p className="font-bold mb-0.5">¿Cómo funciona el pago?</p>
          <p>
            Cuando un comprador confirma la recepción de su pedido, el monto en escrow se libera
            y Merkao lo transfiere a los datos que registras aquí en un plazo de 1–2 días hábiles.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Datos del titular ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Titular de la cuenta</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre completo del titular <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre_titular"
              value={form.nombre_titular}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez García"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>
        </div>

        {/* ── Cuenta bancaria ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Cuenta bancaria</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
            <select
              name="banco"
              value={form.banco}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition bg-white"
            >
              <option value="">— Selecciona tu banco —</option>
              {BANCOS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Número de cuenta
            </label>
            <input
              type="text"
              name="num_cuenta"
              value={form.num_cuenta}
              onChange={handleChange}
              placeholder="Ej. 191-12345678-0-12"
              inputMode="numeric"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              CCI — Código de Cuenta Interbancario
            </label>
            <input
              type="text"
              name="cci"
              value={form.cci}
              onChange={handleChange}
              placeholder="20 dígitos — Ej. 00219100123456780112"
              inputMode="numeric"
              maxLength={20}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Puedes ver tu CCI en la app de tu banco o en la sección "Mis cuentas".
            </p>
          </div>
        </div>

        {/* ── Yape / Plin ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Yape / Plin</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Número de celular registrado en Yape o Plin
            </label>
            <div className="flex gap-2">
              <span className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-500 bg-gray-50 shrink-0">
                🇵🇪 +51
              </span>
              <input
                type="tel"
                name="yape_plin"
                value={form.yape_plin}
                onChange={handleChange}
                placeholder="9XX XXX XXX"
                inputMode="numeric"
                maxLength={9}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Solo para montos menores a S/ 2,000. Para importes mayores se usará transferencia bancaria.
            </p>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}
        {exito && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
            ✅ Datos de pago guardados correctamente.
          </div>
        )}

        {/* Botón guardar */}
        <button
          type="submit"
          disabled={guardando}
          className="w-full py-3.5 rounded-xl font-black text-sm transition hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: '#FF9900', color: '#131921' }}
        >
          {guardando ? 'Guardando...' : '💾 Guardar datos de pago'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Tu información bancaria está protegida y solo se usa para realizar pagos a tu cuenta.
        </p>

      </form>
    </div>
  )
}
