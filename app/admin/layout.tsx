'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { isAdminEmail } from '@/lib/admin'

type NavItem = { href: string; label: string }

const NAV: NavItem[] = [
  { href: '/admin/metricas',   label: 'Métricas' },
  { href: '/admin/comisiones', label: 'Comisiones' },
  { href: '/admin/soporte',    label: 'Soporte' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, loading } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (!isAdminEmail(user.email)) { router.replace('/'); return }
  }, [user, loading, router])

  // Count threads where last message is from vendor (needs a reply)
  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const res = await fetch('/api/soporte/threads', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json() as { threads?: { nuevo: boolean }[] }
      setUnread((json.threads ?? []).filter((t) => t.nuevo).length)
    })()
  }, [user, pathname])

  if (loading || !user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top nav */}
      <nav style={{
        background: '#0b1220', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 0,
        padding: '0 24px', height: 52, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a
          href="/"
          style={{ fontWeight: 900, fontSize: 18, color: '#fff', textDecoration: 'none', letterSpacing: '-.02em', marginRight: 32 }}
        >
          merkao<span style={{ color: '#3b82f6' }}>.pe</span>
        </a>

        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#64748b', marginRight: 24, textTransform: 'uppercase' }}>
          Admin
        </span>

        {NAV.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isSoporte = item.href === '/admin/soporte'
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 14px', height: 52, textDecoration: 'none',
                fontSize: 14, fontWeight: isActive ? 700 : 400,
                color: isActive ? '#fff' : '#94a3b8',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'color .15s',
              }}
            >
              {item.label}
              {isSoporte && unread > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff',
                  borderRadius: 20, fontSize: 11, fontWeight: 700,
                  padding: '1px 6px', lineHeight: '18px',
                  minWidth: 18, textAlign: 'center',
                }}>
                  {unread}
                </span>
              )}
            </a>
          )
        })}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#475569' }}>{user.email}</span>
      </nav>

      {/* Page content */}
      <div>
        {children}
      </div>
    </div>
  )
}
