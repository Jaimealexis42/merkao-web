import type { IconName } from '@/lib/icons'

export type CatDef = { id: number; slug: string; nombre: string; icon: IconName; descripcion: string }

export const CATEGORIAS: CatDef[] = [
  { id: 1, slug: 'ropa-y-moda',   nombre: 'Ropa y moda',    icon: 'shirt',      descripcion: 'Lo mejor de la moda peruana: alpaca, algodón pima y diseños únicos.' },
  { id: 2, slug: 'electronicos',  nombre: 'Electrónicos',   icon: 'smartphone', descripcion: 'Smartphones, accesorios y tecnología con garantía y Pago Escrow.' },
  { id: 3, slug: 'alimentos',     nombre: 'Alimentos',      icon: 'food',       descripcion: 'Café, cacao, granos andinos y productos artesanales del Perú.' },
  { id: 4, slug: 'artesanias',    nombre: 'Artesanías',     icon: 'palette',    descripcion: 'Retablos, textiles y cerámica directo de los maestros artesanos.' },
  { id: 5, slug: 'hogar',         nombre: 'Hogar',          icon: 'home',       descripcion: 'Muebles, decoración y todo lo que tu casa necesita.' },
  { id: 6, slug: 'autos-y-motos', nombre: 'Autos y motos',  icon: 'car',        descripcion: 'Repuestos, accesorios y vehículos seminuevos en todo el Perú.' },
  { id: 7, slug: 'agricola',      nombre: 'Agrícola',       icon: 'sprout',     descripcion: 'Insumos, semillas y herramientas para el campo peruano.' },
  { id: 8, slug: 'otros',         nombre: 'Otros',          icon: 'box',        descripcion: 'Todo lo demás que vale la pena descubrir en Merkao.' },
]
