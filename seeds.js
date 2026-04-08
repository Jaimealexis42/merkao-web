// seeds.js — Insertar 20 productos de ejemplo en Supabase
// Uso: node seeds.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mlpsewryuaoklvokhejd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scHNld3J5dWFva2x2b2toZWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDUwNzAsImV4cCI6MjA5MDM4MTA3MH0.1e05b6LsAV8Z0S6UaN3JROlVnJkYzpHcJARrJGgWUzQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const productos = [
  // ── ROPA Y MODA (categoria_id = 1) ──────────────────────────
  {
    categoria_id: 1,
    nombre: 'Chompa de alpaca tejida a mano — Cusco',
    descripcion: 'Chompa 100% alpaca baby tejida a mano por artesanas de Cusco. Tallas S, M y L. Colores: azul marino, rojo y natural. Abriga sin pesar.',
    precio: 85.00, stock: 30, estado: 'activo', ciudad: 'Cusco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/chompa-alpaca/400/400', 'https://picsum.photos/seed/chompa-alpaca-2/400/400'],
  },
  {
    categoria_id: 1,
    nombre: 'Vestido bordado ayacuchano multicolor',
    descripcion: 'Vestido tradicional con bordados florales hechos a mano en Ayacucho. Algodón 100% peruano. Tallas XS-XL. Perfecto para fiestas y eventos.',
    precio: 120.00, stock: 15, estado: 'activo', ciudad: 'Ayacucho', vistas: 0,
    imagenes: ['https://picsum.photos/seed/vestido-ayacucho/400/400', 'https://picsum.photos/seed/vestido-ayacucho-2/400/400'],
  },
  {
    categoria_id: 1,
    nombre: 'Polo de algodón pima peruano — Pack x3',
    descripcion: 'Pack de 3 polos de algodón pima extrafino, el tejido más suave del mundo. Colores variados. Tallas S al XXL. Certificado GOTS.',
    precio: 65.00, stock: 80, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/polo-pima/400/400'],
  },

  // ── ELECTRÓNICOS (categoria_id = 2) ─────────────────────────
  {
    categoria_id: 2,
    nombre: 'Laptop HP Pavilion 15" Intel Core i5 16GB SSD 512GB',
    descripcion: 'Pantalla FHD 15.6", procesador Intel Core i5 12a gen, 16GB RAM DDR4, SSD NVMe 512GB. Windows 11 Home. Garantía 1 año.',
    precio: 2499.00, stock: 12, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/laptop-hp/400/400', 'https://picsum.photos/seed/laptop-hp-2/400/400'],
  },
  {
    categoria_id: 2,
    nombre: 'Samsung Galaxy A54 5G 128GB — Negro',
    descripcion: 'Pantalla Super AMOLED 6.4", cámara triple 50MP, batería 5000mAh, carga rápida 25W. 8GB RAM. Incluye cargador y funda.',
    precio: 1199.00, stock: 25, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/samsung-a54/400/400'],
  },
  {
    categoria_id: 2,
    nombre: 'Smart TV LG 43" 4K UHD webOS ThinQ AI',
    descripcion: 'Resolución 4K, sistema webOS con Netflix, YouTube y Prime Video. Control por voz ThinQ AI. HDMI x2, USB x2. Soporte incluido.',
    precio: 1599.00, stock: 8, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/smart-tv-lg/400/400', 'https://picsum.photos/seed/smart-tv-lg-2/400/400'],
  },

  // ── ALIMENTOS (categoria_id = 3) ────────────────────────────
  {
    categoria_id: 3,
    nombre: 'Quinua orgánica blanca Puno — 5 kg',
    descripcion: 'Quinua blanca orgánica certificada, cultivada a 3800 msnm en el altiplano puneño. Sin pesticidas. 14g de proteína por 100g.',
    precio: 45.00, stock: 200, estado: 'activo', ciudad: 'Puno', vistas: 0,
    imagenes: ['https://picsum.photos/seed/quinua-puno/400/400'],
  },
  {
    categoria_id: 3,
    nombre: 'Café especial Villa Rica 500 g — Molido',
    descripcion: 'Café arábica de altura de Villa Rica, Pasco. Notas de chocolate y frutos rojos. Tostado medio. Para cafetera de goteo o prensa francesa.',
    precio: 35.00, stock: 150, estado: 'activo', ciudad: 'Pasco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/cafe-villa-rica/400/400'],
  },
  {
    categoria_id: 3,
    nombre: 'Cacao puro en polvo Amazonas 1 kg — Orgánico',
    descripcion: 'Cacao criollo 100% natural sin azúcar ni aditivos. Producido en San Martín. Certificado orgánico USDA. Ideal para chocolatería y repostería.',
    precio: 28.00, stock: 120, estado: 'activo', ciudad: 'San Martín', vistas: 0,
    imagenes: ['https://picsum.photos/seed/cacao-amazonas/400/400'],
  },

  // ── ARTESANÍAS (categoria_id = 4) ───────────────────────────
  {
    categoria_id: 4,
    nombre: 'Cuadro shipibo-conibo original 40×60 cm',
    descripcion: 'Obra original pintada a mano por artista shipibo de Ucayali. Motivos geométricos ancestrales sobre tela. Certificado de autenticidad. Marco incluido.',
    precio: 180.00, stock: 5, estado: 'activo', ciudad: 'Ucayali', vistas: 0,
    imagenes: ['https://picsum.photos/seed/cuadro-shipibo/400/400', 'https://picsum.photos/seed/cuadro-shipibo-2/400/400'],
  },
  {
    categoria_id: 4,
    nombre: 'Cerámica Chulucanas — Jarrón decorativo grande',
    descripcion: 'Jarrón de cerámica Chulucanas, técnica ancestral de Piura. Motivos preincas en negativo. Pieza única de 35 cm. Declarada Patrimonio Cultural.',
    precio: 220.00, stock: 8, estado: 'activo', ciudad: 'Piura', vistas: 0,
    imagenes: ['https://picsum.photos/seed/ceramica-chulucanas/400/400'],
  },
  {
    categoria_id: 4,
    nombre: 'Retablo ayacuchano — Escena costumbrista',
    descripcion: 'Retablo de madera tallado y pintado a mano en Huamanga. Escena de feria campesina con más de 30 figuras. 25×20 cm.',
    precio: 150.00, stock: 10, estado: 'activo', ciudad: 'Ayacucho', vistas: 0,
    imagenes: ['https://picsum.photos/seed/retablo-ayacucho/400/400'],
  },

  // ── HOGAR (categoria_id = 5) ─────────────────────────────────
  {
    categoria_id: 5,
    nombre: 'Silla gamer ergonómica RGB reclinable 180°',
    descripcion: 'Soporte lumbar y cervical, reclinación hasta 180°, apoyabrazos 4D, luces RGB. Peso máximo 150 kg. Incluye almohada de cuello. Color negro/rojo.',
    precio: 450.00, stock: 18, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/silla-gamer/400/400', 'https://picsum.photos/seed/silla-gamer-2/400/400'],
  },
  {
    categoria_id: 5,
    nombre: 'Licuadora Oster Pro 700W — 3 velocidades y pulso',
    descripcion: 'Jarra de vidrio 1.25L resistente a impactos. 3 velocidades + función pulso. Cuchillas de acero inoxidable. Base antideslizante. Garantía 2 años.',
    precio: 189.00, stock: 35, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/licuadora-oster/400/400'],
  },
  {
    categoria_id: 5,
    nombre: 'Sofá 2 cuerpos tela antimanchas gris Oxford',
    descripcion: 'Estructura de madera maciza y espuma de alta densidad. Tapizado en tela antimanchas fácil de limpiar. 145 cm de ancho. Entrega en Lima.',
    precio: 890.00, stock: 6, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/sofa-gris/400/400', 'https://picsum.photos/seed/sofa-gris-2/400/400'],
  },

  // ── AUTOS Y MOTOS (categoria_id = 6) ────────────────────────
  {
    categoria_id: 6,
    nombre: 'Moto Honda Wave 110cc Alpha 2024 — Azul',
    descripcion: 'Motor 4 tiempos OHC, freno de disco delantero, arranque eléctrico y a pedal. Rendimiento 55 km/L. SOAT incluido. Modelo 2024.',
    precio: 7500.00, stock: 4, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/moto-honda/400/400', 'https://picsum.photos/seed/moto-honda-2/400/400'],
  },
  {
    categoria_id: 6,
    nombre: 'Batería Bosch S4 60Ah 12V — Universal',
    descripcion: 'Batería 60Ah 12V 540A de arranque en frío. Compatible con la mayoría de vehículos. Sin mantenimiento. Garantía 18 meses.',
    precio: 280.00, stock: 20, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/bateria-bosch/400/400'],
  },
  {
    categoria_id: 6,
    nombre: 'Llantas Bridgestone Ecopia 195/65 R15 — Par',
    descripcion: 'Par de llantas bajo consumo de combustible y alta durabilidad. Fabricadas en Japón. Incluye balanceo y montaje en Lima.',
    precio: 320.00, stock: 30, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/llantas-bridgestone/400/400'],
  },

  // ── AGRÍCOLA (categoria_id = 7) ──────────────────────────────
  {
    categoria_id: 7,
    nombre: 'Motocultor Loncin 7HP a gasolina con accesorios',
    descripcion: 'Motor Loncin 4 tiempos a gasolina. Incluye rejas de arado, surcador y cultivador. Ideal para pequeños y medianos agricultores. Garantía 1 año.',
    precio: 2800.00, stock: 7, estado: 'activo', ciudad: 'Junín', vistas: 0,
    imagenes: ['https://picsum.photos/seed/motocultor-loncin/400/400', 'https://picsum.photos/seed/motocultor-loncin-2/400/400'],
  },
  {
    categoria_id: 7,
    nombre: 'Semillas de papa nativa Huayro — Huancavelica 5 kg',
    descripcion: 'Semillas certificadas variedad Huayro de Huancavelica. Alto rendimiento, resistentes a heladas. Libres de pesticidas. Para 250 m².',
    precio: 38.00, stock: 100, estado: 'activo', ciudad: 'Huancavelica', vistas: 0,
    imagenes: ['https://picsum.photos/seed/semillas-papa/400/400'],
  },
]

const categorias = {
  1: 'Ropa y Moda', 2: 'Electrónicos', 3: 'Alimentos',
  4: 'Artesanías', 5: 'Hogar', 6: 'Autos y Motos', 7: 'Agrícola',
}

async function seed() {
  console.log(`Insertando ${productos.length} productos...`)

  const { data, error } = await supabase
    .from('productos')
    .insert(productos)
    .select('id, nombre, categoria_id, ciudad')

  if (error) {
    console.error('Error al insertar:', error.message)
    process.exit(1)
  }

  console.log(`\n✓ ${data.length} productos insertados:\n`)
  data.forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(2, ' ')}. [${categorias[p.categoria_id]}] ${p.nombre} — ${p.ciudad}`)
  })
  console.log('\n¡Seed completado exitosamente!')
}

seed()
