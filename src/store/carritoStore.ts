import { create } from 'zustand'

export type ItemCarrito = {
  id: string
  nombre: string
  precio: number      // precio con IGV incluido
  cantidad: number
  imagen: string | null
  vendedor: string
}

type CarritoStore = {
  items: ItemCarrito[]

  // Mutaciones
  agregarItem:     (item: Omit<ItemCarrito, 'cantidad'>, cantidad?: number) => void
  quitarItem:      (id: string) => void
  cambiarCantidad: (id: string, cantidad: number) => void
  vaciarCarrito:   () => void

  // Computed
  totalItems:  () => number
  totalPrecio: () => number
}

export const useCarritoStore = create<CarritoStore>((set, get) => ({
  items: [],

  agregarItem: (item, cantidad = 1) =>
    set((state) => {
      const existe = state.items.find((i) => i.id === item.id)
      if (existe) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, cantidad: i.cantidad + cantidad } : i
          ),
        }
      }
      return { items: [...state.items, { ...item, cantidad }] }
    }),

  quitarItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  cambiarCantidad: (id, cantidad) =>
    set((state) => {
      if (cantidad <= 0) {
        return { items: state.items.filter((i) => i.id !== id) }
      }
      return {
        items: state.items.map((i) =>
          i.id === id ? { ...i, cantidad } : i
        ),
      }
    }),

  vaciarCarrito: () => set({ items: [] }),

  totalItems:  () => get().items.reduce((sum, i) => sum + i.cantidad, 0),
  totalPrecio: () => get().items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
}))
