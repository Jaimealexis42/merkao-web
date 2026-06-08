'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { fmt } from '@/lib/precios'

type FiltroEstado = 'todos' | 'pendiente' | 'enviado' | 'entregado'

interface Pedido {
  id: string
  nombre_comprador: string | null
  monto_total: number | null
  estado: string | null
  created_at: string
  producto: { id: string; nombre: string } | null
}

const ESTADO_PILL: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  pagado:     'bg-blue-100 text-blue-700',
  preparando: 'bg-yellow-100 text-yellow-700',
  enviado:    'bg-indigo-100 text-indigo-700',
  en_camino:  'bg-indigo-100 text-indigo-700',
  entregado:  'bg-green-100 text-green-700',
  cancelado:  'bg-red-100 text-red-700',
}

const FILTROS: { id: FiltroEstado; label: string; icon: string }[] = [
  { id: 'todos',     label: 'Todos',     icon: '📋' },
  { id: 'pendiente', label: 'Pendientes', icon: '⏳' },
  { id: 'enviado',   label: 'Enviados',  icon: '📦' },
  { id: 'entregado', label: 'Entregados', icon: '✅' },
]

export default function VendedorPedidosPage() {
  const { user, loading: authLoading } = useAuth()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')

  useEffect(() => {
    if (authLoading || !user) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      setError(null)

      // 1) Pedidos del vendedor (sin embed — no hay FK declarado entre
      //    pedidos.producto_id y productos.id, así PostgREST no puede inferir
      //    el join automático).
      const { data: pedidosData, error: ePed } = await supabase
        .from('pedidos')
        .select('id, producto_id, nombre_comprador, monto_total, estado, created_at')
        .eq('vendedor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (cancel) return
      if (ePed) {
        setError(ePed.message)
        setLoading(false)
        return
      }

      // 2) Si no hay pedidos, terminar.
      if (!pedidosData || pedidosData.length === 0) {
        setPedidos([])
        setLoading(false)
        return
      }

      // 3) Batch-fetch de productos por ID único (1 query extra).
      const idsUnicos = Array.from(
        new Set(
          pedidosData
            .map((p) => p.producto_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      )

      const productosMap = new Map<string, { id: string; nombre: string }>()
      if (idsUnicos.length > 0) {
        const { data: prods, error: eProd } = await supabase
          .from('productos')
          .select('id, nombre')
          .in('id', idsUnicos)
        if (cancel) return
        if (eProd) {
          // No es fatal: mostramos los pedidos pero sin nombre de producto.
          console.warn('[pedidos] no se pudieron cargar productos:', eProd.message)
        } else {
          for (const p of prods ?? []) productosMap.set(p.id, p)
        }
      }

      // 4) Merge en JS.
      const merged: Pedido[] = pedidosData.map((p) => ({
        id: p.id,
        nombre_comprador: p.nombre_comprador,
        monto_total: p.monto_total,
        estado: p.estado,
        created_at: p.created_at,
        producto: p.producto_id ? productosMap.get(p.producto_id) ?? null : null,
      }))
      setPedidos(merged)
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [authLoading, user])

  // Filtrado client-side: matchea estado contra el filtro de forma flexible
  // (acepta sinónimos del flujo de tracking).
  const filtrados = useMemo(() => {
    if (filtro === 'todos') return pedidos
    const sinonimos: Record<FiltroEstado, string[]> = {
      todos:     [],
      pendiente: ['pendiente', 'pagado', 'preparando'],
      enviado:   ['enviado', 'en_camino'],
      entregado: ['entregado'],
    }
    const matchAny = sinonimos[filtro]
    return pedidos.filter((p) => matchAny.includes((p.estado ?? '').toLowerCase()))
  }, [pedidos, filtro])

  const conteoPorFiltro = useMemo(() => {
    const c: Record<FiltroEstado, number> = { todos: pedidos.length, pendiente: 0, enviado: 0, entregado: 0 }
    for (const p of pedidos) {
      const est = (p.estado ?? '').toLowerCase()
      if (['pendiente', 'pagado', 'preparando'].includes(est)) c.pendiente++
      else if (['enviado', 'en_camino'].includes(est)) c.enviado++
      else if (est === 'entregado') c.entregado++
    }
    return c
  }, [pedidos])

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-black text-gray-800">Mis pedidos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Todos los pedidos de tu tienda. Tocá &ldquo;Ver tracking&rdquo; para actualizar el estado y avisar al comprador.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const active = filtro === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={
                active
                  ? 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 text-white shadow-sm'
                  : 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }
            >
              <span>{f.icon}</span>
              {f.label}
              <span className={active ? 'text-[10px] font-bold bg-white/25 px-1.5 py-0.5 rounded-full' : 'text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full'}>
                {conteoPorFiltro[f.id]}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ⚠️ No se pudieron cargar los pedidos: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-12 text-center text-sm text-gray-400 animate-pulse">
          Cargando pedidos…
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtrados.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-16 text-center">
          <p className="text-5xl mb-3">📭</p>
          <p className="text-gray-700 font-bold">
            {filtro === 'todos' ? 'Todavía no tienes pedidos' : `No hay pedidos en "${FILTROS.find((f) => f.id === filtro)?.label}"`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {filtro === 'todos'
              ? 'Cuando un comprador pague, vas a verlo acá.'
              : 'Probá con otro filtro para ver los demás pedidos.'}
          </p>
        </div>
      )}

      {/* Tabla (desktop) */}
      {!loading && !error && filtrados.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 font-bold">#</th>
                    <th className="px-4 py-3 font-bold">Producto</th>
                    <th className="px-4 py-3 font-bold">Comprador</th>
                    <th className="px-4 py-3 font-bold text-right">Monto</th>
                    <th className="px-4 py-3 font-bold">Estado</th>
                    <th className="px-4 py-3 font-bold">Fecha</th>
                    <th className="px-4 py-3 font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map((p) => {
                    const fecha = new Date(p.created_at).toLocaleString('es-PE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                    const pill = ESTADO_PILL[(p.estado ?? '').toLowerCase()] ?? 'bg-gray-100 text-gray-700'
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-gray-500">#{p.id.slice(0, 8)}</code>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-gray-800 truncate" title={p.producto?.nombre ?? '—'}>
                            {p.producto?.nombre ?? <span className="text-gray-400 italic">producto eliminado</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.nombre_comprador ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                          {p.monto_total != null ? fmt(p.monto_total) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${pill}`}>
                            {p.estado ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fecha}</td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/vendedor/tracking/${p.id}`}
                            className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                          >
                            Ver tracking →
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden space-y-3">
            {filtrados.map((p) => {
              const fecha = new Date(p.created_at).toLocaleString('es-PE', {
                dateStyle: 'short',
                timeStyle: 'short',
              })
              const pill = ESTADO_PILL[(p.estado ?? '').toLowerCase()] ?? 'bg-gray-100 text-gray-700'
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <code className="text-xs font-mono text-gray-500">#{p.id.slice(0, 8)}</code>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pill}`}>
                      {p.estado ?? '—'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 line-clamp-2">
                    {p.producto?.nombre ?? <span className="text-gray-400 italic">producto eliminado</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">para {p.nombre_comprador ?? '—'}</p>
                  <div className="flex items-end justify-between mt-3 pt-3 border-t border-gray-50">
                    <div>
                      <p className="text-base font-black text-gray-800">{p.monto_total != null ? fmt(p.monto_total) : '—'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{fecha}</p>
                    </div>
                    <a
                      href={`/vendedor/tracking/${p.id}`}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition"
                    >
                      Ver tracking →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
