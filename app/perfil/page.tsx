'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/precios'
import { useAuth } from '@/lib/useAuth'

type Pedido = {
  id: string
  total: number
  estado: string
  created_at: string
  direccion_entrega: string
  metodo_pago: string
}

const ESTADO_BADGE: Record<string, { label: string; icono: string; clases: string }> = {
  pagado:    { label: 'Pagado',    icono: '💳', clases: 'bg-blue-100 text-blue-700' },
  enviado:   { label: 'Enviado',   icono: '📦', clases: 'bg-amber-100 text-amber-700' },
  entregado: { label: 'Entregado', icono: '🚚', clases: 'bg-green-100 text-green-700' },
  liberado:  { label: 'Completado', icono: '✅', clases: 'bg-green-100 text-green-800' },
  disputado: { label: 'En disputa', icono: '⚠️', clases: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', icono: '✕',  clases: 'bg-gray-100 text-gray-500' },
}

function EstadoBadge({ estado }: { estado: string }) {
  const b = ESTADO_BADGE[estado] ?? { label: estado, icono: '•', clases: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${b.clases}`}>
      {b.icono} {b.label}
    </span>
  )
}

export default function PerfilPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pedidos, setPedidos]         = useState<Pedido[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)
  const [signingOut, setSigningOut]   = useState(false)

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  // Cargar pedidos del usuario
  useEffect(() => {
    if (!user) return
    supabase
      .from('pedidos')
      .select('id, total, estado, created_at, direccion_entrega, metodo_pago')
      .eq('comprador_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPedidos(data ?? [])
        setLoadingPedidos(false)
      })
  }, [user])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#EAEDED] flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Cargando...</p>
      </div>
    )
  }

  if (!user) return null

  const nombre    = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuario'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const inicial   = nombre[0]?.toUpperCase() ?? 'U'
  const miembro   = new Date(user.created_at).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#EAEDED]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#131921' }}>
        <a href="/" className="flex items-center gap-0.5 border-2 border-transparent hover:border-white rounded px-1 py-1 transition shrink-0">
          <span className="text-white text-2xl font-black tracking-tight">merkao</span>
          <span className="text-2xl font-black" style={{ color: '#FF9900' }}>.pe</span>
        </a>

        <div className="flex-1" />

        <a href="/pedidos" className="hidden sm:flex flex-col shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 transition">
          <span className="text-gray-400 text-[11px]">Mis</span>
          <span className="text-white text-xs font-bold">pedidos</span>
        </a>

        <a href="/carrito" className="relative flex items-end gap-1 border-2 border-transparent hover:border-white rounded px-2 py-1 transition shrink-0">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
          </svg>
          <span className="text-white text-xs font-bold hidden sm:inline pb-0.5">Carrito</span>
        </a>
      </header>

      {/* ── Barra nav secundaria ── */}
      <div style={{ backgroundColor: '#232f3e' }}>
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2 text-xs text-gray-400">
          <a href="/" className="hover:text-white transition">Inicio</a>
          <span>/</span>
          <span className="text-white">Mi perfil</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Tarjeta de perfil ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-5 flex-wrap">

            {/* Avatar */}
            <div className="shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nombre}
                  className="w-20 h-20 rounded-full object-cover border-4 border-orange-100"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-orange-200"
                  style={{ backgroundColor: '#FF9900' }}
                >
                  {inicial}
                </div>
              )}
            </div>

            {/* Datos */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-gray-900 leading-tight truncate">{nombre}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">Miembro desde {miembro}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                <a
                  href="/vendedor"
                  className="text-xs font-bold px-4 py-2 rounded-lg border-2 border-orange-400 text-orange-600 hover:bg-orange-50 transition"
                >
                  🏪 Panel vendedor
                </a>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-xs font-bold px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {signingOut ? 'Cerrando...' : '🚪 Cerrar sesión'}
                </button>
              </div>
            </div>

            {/* Stats rápidas */}
            <div className="flex gap-4 text-center shrink-0">
              <div className="bg-orange-50 rounded-xl px-5 py-3">
                <p className="text-2xl font-black text-orange-500">{pedidos.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Pedidos</p>
              </div>
              <div className="bg-green-50 rounded-xl px-5 py-3">
                <p className="text-2xl font-black text-green-600">
                  {pedidos.filter((p) => p.estado === 'entregado' || p.estado === 'liberado').length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Completados</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Historial de pedidos ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-base font-black text-gray-800">Historial de pedidos</h2>
            <a href="/pedidos" className="text-xs font-bold hover:underline" style={{ color: '#007185' }}>
              Ver todos →
            </a>
          </div>

          {loadingPedidos ? (
            <div className="px-6 py-10 text-center">
              <p className="text-gray-400 text-sm animate-pulse">Cargando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-600 font-medium">Todavía no tienes pedidos</p>
              <p className="text-sm text-gray-400 mt-1">Cuando compres algo aparecerá aquí.</p>
              <a
                href="/"
                className="inline-block mt-5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
                style={{ backgroundColor: '#FF9900', color: '#131921' }}
              >
                Explorar productos
              </a>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {pedidos.map((pedido) => {
                const fecha = new Date(pedido.created_at).toLocaleDateString('es-PE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
                return (
                  <li key={pedido.id}>
                    <a
                      href={`/pedidos/${pedido.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition group"
                    >
                      {/* Icono estado */}
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg shrink-0">
                        {ESTADO_BADGE[pedido.estado]?.icono ?? '📦'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{fecha}</p>
                        <p className="text-sm font-bold text-gray-800 truncate">
                          Pedido <code className="font-mono text-xs bg-gray-100 px-1 rounded">{pedido.id.slice(0, 8)}…</code>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{pedido.direccion_entrega || 'Sin dirección registrada'}</p>
                      </div>

                      {/* Estado + total */}
                      <div className="text-right shrink-0 space-y-1.5">
                        <EstadoBadge estado={pedido.estado} />
                        <p className="text-sm font-black text-gray-900">{fmt(pedido.total)}</p>
                      </div>

                      <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Info de cuenta ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-black text-gray-800 mb-4">Información de cuenta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Correo electrónico</p>
              <p className="font-medium text-gray-800">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">ID de usuario</p>
              <p className="font-mono text-xs text-gray-500 truncate">{user.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Verificación de email</p>
              <p className={`font-medium ${user.email_confirmed_at ? 'text-green-600' : 'text-amber-600'}`}>
                {user.email_confirmed_at ? '✅ Verificado' : '⚠️ Pendiente'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Último acceso</p>
              <p className="font-medium text-gray-800">
                {new Date(user.last_sign_in_at ?? user.created_at).toLocaleDateString('es-PE', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
