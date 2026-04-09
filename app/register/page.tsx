'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function RegisterForm() {
  const [nombre, setNombre]     = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tipo, setTipo]         = useState<'comprador' | 'vendedor'>('comprador')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('tipo') === 'vendedor') setTipo('vendedor')
  }, [params])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, telefono: `+51${telefono}`, tipo },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push(tipo === 'vendedor' ? '/vendedor' : '/')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-black text-orange-500">Merkao</a>
          <p className="text-gray-500 mt-1 text-sm">Crea tu cuenta gratis</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Tipo de cuenta */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setTipo('comprador')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition ${
                tipo === 'comprador'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
            >
              🛒 Comprador
            </button>
            <button
              type="button"
              onClick={() => setTipo('vendedor')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition ${
                tipo === 'vendedor'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
            >
              🏪 Vendedor
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono (WhatsApp)
              </label>
              <div className="flex gap-2">
                <span className="border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-500 bg-gray-50">🇵🇪 +51</span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="987 654 321"
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>

            {tipo === 'vendedor' && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-700">
                🎉 <strong>¡0% de comisión los primeros 3 meses!</strong> Después aplica una comisión del 5-10% por venta según la categoría.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-60"
            >
              {loading ? 'Creando cuenta...' : `Crear cuenta ${tipo === 'vendedor' ? 'de vendedor' : 'gratis'}`}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Al registrarte aceptas nuestros{' '}
              <a href="/terminos" className="text-orange-500 hover:underline">Términos y condiciones</a>
            </p>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-orange-500 font-bold hover:underline">
              Inicia sesión
            </a>
          </p>
        </div>

      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
