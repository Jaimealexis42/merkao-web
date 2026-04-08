'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

const navItems = [
  { href: '/vendedor',              label: 'Dashboard',         icon: '📊' },
  { href: '/vendedor/publicar',     label: 'Publicar producto', icon: '➕' },
  { href: '/vendedor/mis-productos', label: 'Mis productos',    icon: '📦' },
  { href: '/vendedor/pedidos',      label: 'Pedidos',           icon: '🚚' },
  { href: '/vendedor/mi-tienda',    label: 'Mi tienda',         icon: '🏪' },
]

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Verificando sesión...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="bg-orange-500 text-white px-4 py-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-xl leading-none"
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <a href="/" className="text-xl font-black tracking-tight">Merkao</a>
            <span className="hidden md:inline text-orange-200 text-sm">/ Panel de vendedor</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden md:inline text-orange-100 text-xs">
              {user.email}
            </span>
            <a
              href="/"
              className="bg-white text-orange-500 px-3 py-1 rounded-lg font-bold text-xs hover:bg-orange-50 transition"
            >
              Ver marketplace
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex gap-6 flex-1">

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-56 shrink-0`}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-20">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Menú</p>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 font-bold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </a>
                )
              })}
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition"
              >
                <span className="text-base">🚪</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

      </div>
    </div>
  )
}
