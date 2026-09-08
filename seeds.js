// seeds.js — Limpia productos de prueba e inserta la selección diversa de septiembre 2026
// Uso: node seeds.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mlpsewryuaoklvokhejd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scHNld3J5dWFva2x2b2toZWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDUwNzAsImV4cCI6MjA5MDM4MTA3MH0.1e05b6LsAV8Z0S6UaN3JROlVnJkYzpHcJARrJGgWUzQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const productos = [

  // ── ROPA Y MODA (categoria_id = 1) ──────────────────────────────────────
  {
    categoria_id: 1,
    nombre: 'Chompa de alpaca baby tejida a mano — Cusco',
    descripcion: 'Chompa 100% alpaca baby tejida a mano por artesanas de Cusco. Tallas S, M y L. Colores: azul marino, rojo y natural. Abriga sin pesar. Perfecta como regalo de temporada.',
    precio: 85.00, stock: 30, estado: 'activo', ciudad: 'Cusco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/chompa-alpaca/400/400', 'https://picsum.photos/seed/chompa-alpaca-2/400/400'],
  },
  {
    categoria_id: 1,
    nombre: 'Vestido bordado ayacuchano multicolor',
    descripcion: 'Vestido tradicional con bordados florales hechos a mano en Ayacucho. Algodón 100% peruano. Tallas XS-XL. Perfecto para fiestas y eventos de primavera.',
    precio: 120.00, stock: 15, estado: 'activo', ciudad: 'Ayacucho', vistas: 0,
    imagenes: ['https://picsum.photos/seed/vestido-ayacucho/400/400', 'https://picsum.photos/seed/vestido-ayacucho-2/400/400'],
  },
  {
    categoria_id: 1,
    nombre: 'Blusa de lino artesanal con bordado floral — Arequipa',
    descripcion: 'Blusa de lino 100% con bordados florales hechos a mano en Arequipa. Fresca y ligera, ideal para la primavera. Tallas S, M, L, XL. Colores: blanco y celeste.',
    precio: 95.00, stock: 20, estado: 'activo', ciudad: 'Arequipa', vistas: 0,
    imagenes: ['https://picsum.photos/seed/blusa-lino-arequipa/400/400'],
  },
  {
    categoria_id: 1,
    nombre: 'Camiseta algodón pima estampada — Arte peruano',
    descripcion: 'Camiseta de algodón pima extrafino con estampado artístico de motivos andinos. La más suave del mundo. Unisex. Tallas S al XL. Envío a todo el Perú.',
    precio: 45.00, stock: 80, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/camiseta-pima-estampada/400/400'],
  },
  {
    categoria_id: 1,
    nombre: 'Chaleco de alpaca reversible — dos colores',
    descripcion: 'Chaleco reversible en alpaca fina con dos acabados: uno liso y uno con textura. Cusco, tejido a mano. Tallas S, M, L. Colores: gris/mostaza y azul/natural.',
    precio: 110.00, stock: 12, estado: 'activo', ciudad: 'Cusco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/chaleco-alpaca-reversible/400/400'],
  },

  // ── ELECTRÓNICOS (categoria_id = 2) ─────────────────────────────────────
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
    nombre: 'Audífonos Bluetooth JBL Tune 510BT — Blanco',
    descripcion: 'Auriculares inalámbricos over-ear JBL. Batería 40 horas, plegables, conexión multipunto. Compatible con iOS y Android. Incluye cable USB-C.',
    precio: 189.00, stock: 40, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/audifonos-jbl/400/400'],
  },
  {
    categoria_id: 2,
    nombre: 'Tablet Amazon Fire 7 32GB — Edición 2024',
    descripcion: 'Pantalla 7", 32GB almacenamiento, hasta 10h batería. Acceso a Netflix, Prime Video, Kindle y más. Ideal para niños y entretenimiento en casa.',
    precio: 299.00, stock: 18, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/tablet-amazon-fire/400/400'],
  },

  // ── ALIMENTOS (categoria_id = 3) ────────────────────────────────────────
  {
    categoria_id: 3,
    nombre: 'Quinua orgánica blanca Puno — 5 kg',
    descripcion: 'Quinua blanca orgánica certificada, cultivada a 3800 msnm en el altiplano puneño. Sin pesticidas. 14g de proteína por 100g.',
    precio: 45.00, stock: 200, estado: 'activo', ciudad: 'Puno', vistas: 0,
    imagenes: ['https://picsum.photos/seed/quinua-puno/400/400'],
  },
  {
    categoria_id: 3,
    nombre: 'Café especial Villa Rica 500g — Molido o en grano',
    descripcion: 'Café arábica de altura de Villa Rica, Pasco. Notas de chocolate y frutos rojos. Tostado medio. Para cafetera de goteo, prensa francesa o espresso.',
    precio: 35.00, stock: 150, estado: 'activo', ciudad: 'Pasco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/cafe-villa-rica/400/400'],
  },
  {
    categoria_id: 3,
    nombre: 'Cacao puro en polvo Amazonas 1 kg — Orgánico',
    descripcion: 'Cacao criollo 100% natural sin azúcar ni aditivos. San Martín. Certificado orgánico USDA. Ideal para chocolatería, repostería y batidos nutritivos.',
    precio: 28.00, stock: 120, estado: 'activo', ciudad: 'San Martín', vistas: 0,
    imagenes: ['https://picsum.photos/seed/cacao-amazonas/400/400'],
  },
  {
    categoria_id: 3,
    nombre: 'Miel de abeja silvestre San Martín 1 L — Sin procesar',
    descripcion: 'Miel cruda de abejas silvestres recolectada en la selva alta de San Martín. Sin pasteurizar ni filtrar. Rica en enzimas y antioxidantes naturales.',
    precio: 42.00, stock: 90, estado: 'activo', ciudad: 'San Martín', vistas: 0,
    imagenes: ['https://picsum.photos/seed/miel-silvestre/400/400'],
  },
  {
    categoria_id: 3,
    nombre: 'Maíz morado premium Cusco 1 kg — Origen certificado',
    descripcion: 'Maíz morado seco de Cusco, variedad Kulli. Alto contenido de antocianinas. Ideal para chicha morada, mazamorra y colorante natural. Secado al sol.',
    precio: 22.00, stock: 300, estado: 'activo', ciudad: 'Cusco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/maiz-morado-cusco/400/400'],
  },

  // ── ARTESANÍAS (categoria_id = 4) ───────────────────────────────────────
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
    descripcion: 'Retablo de madera tallado y pintado a mano en Huamanga. Escena de feria campesina con más de 30 figuras. 25×20 cm. Ideal para regalo.',
    precio: 150.00, stock: 10, estado: 'activo', ciudad: 'Ayacucho', vistas: 0,
    imagenes: ['https://picsum.photos/seed/retablo-ayacucho/400/400'],
  },
  {
    categoria_id: 4,
    nombre: 'Joyería de plata filigrana Catacaos — Aretes largos',
    descripcion: 'Aretes de plata 950 con técnica de filigrana de Catacaos, Piura. Artesanía de 200 años de tradición. 7 cm de largo. Incluye estuche de regalo.',
    precio: 95.00, stock: 20, estado: 'activo', ciudad: 'Piura', vistas: 0,
    imagenes: ['https://picsum.photos/seed/joyeria-catacaos/400/400'],
  },
  {
    categoria_id: 4,
    nombre: 'Bolso tejido aguayo multicolor — Puno',
    descripcion: 'Bolso de tela aguayo tejida a mano en Puno con lana de oveja teñida con tintes naturales. 30×25 cm con asa de cuero. Único e irrepetible.',
    precio: 130.00, stock: 15, estado: 'activo', ciudad: 'Puno', vistas: 0,
    imagenes: ['https://picsum.photos/seed/bolso-aguayo-puno/400/400'],
  },

  // ── HOGAR (categoria_id = 5) ─────────────────────────────────────────────
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
    nombre: 'Set de macetas cerámica andina pintada x3 — Cusco',
    descripcion: 'Juego de 3 macetas de cerámica artesanal pintadas a mano con motivos andinos. Tamaños: 10, 15 y 20 cm. Perfectas para interior y decoración de primavera.',
    precio: 120.00, stock: 25, estado: 'activo', ciudad: 'Cusco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/macetas-ceramica-andina/400/400'],
  },
  {
    categoria_id: 5,
    nombre: 'Set ollas antiadherentes x5 piezas — Mango de madera',
    descripcion: 'Juego de 5 ollas (12, 16, 20, 24 y 28 cm) con revestimiento antiadherente de triple capa y mangos de madera. Apto para todo tipo de cocinas.',
    precio: 280.00, stock: 22, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/ollas-antiadherentes/400/400'],
  },
  {
    categoria_id: 5,
    nombre: 'Espejo con marco de madera tallada — Ayacucho',
    descripcion: 'Espejo ovalado 60×40 cm con marco de madera tallada y pintada a mano por artesanos de Ayacucho. Motivos florales andinos. Incluye gancho para colgar.',
    precio: 210.00, stock: 8, estado: 'activo', ciudad: 'Ayacucho', vistas: 0,
    imagenes: ['https://picsum.photos/seed/espejo-tallado-ayacucho/400/400'],
  },

  // ── AUTOS Y MOTOS (categoria_id = 6) ────────────────────────────────────
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
  {
    categoria_id: 6,
    nombre: 'Casco de moto integral certificado DOT/ECE — M/L',
    descripcion: 'Casco integral con certificación DOT y ECE. Visera anti-UV, interior desmontable y lavable. Sistema de ventilación. Colores: negro mate y blanco.',
    precio: 185.00, stock: 30, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/casco-moto-dot/400/400'],
  },

  // ── AGRÍCOLA (categoria_id = 7) ──────────────────────────────────────────
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
  {
    categoria_id: 7,
    nombre: 'Plantines de hierbas aromáticas x6 — Listos para trasplantar',
    descripcion: 'Pack de 6 plantines: albahaca, menta, romero, tomillo, orégano y culantro. Listos para trasplantar en maceta o jardín. Enviamos en caja especial con ventilación.',
    precio: 35.00, stock: 60, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/plantines-hierbas/400/400'],
  },
  {
    categoria_id: 7,
    nombre: 'Semillas de flores de estación mix peruano — 12 variedades',
    descripcion: 'Mezcla de semillas de flores de temporada seleccionadas para el clima peruano: girasol, cosmos, caléndula, zinnia y más. Para jardín y macetas.',
    precio: 28.00, stock: 150, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/semillas-flores-mix/400/400'],
  },

  // ── OTROS (categoria_id = 8) ─────────────────────────────────────────────
  {
    categoria_id: 8,
    nombre: 'Mochila escolar artesanal bordada — Cusco',
    descripcion: 'Mochila de lona resistente con bordados andinos hechos a mano en Cusco. Capacidad 20L, bolsillo interior para laptop 13". Tiras acolchadas. Colores variados.',
    precio: 145.00, stock: 18, estado: 'activo', ciudad: 'Cusco', vistas: 0,
    imagenes: ['https://picsum.photos/seed/mochila-bordada-cusco/400/400'],
  },
  {
    categoria_id: 8,
    nombre: 'Libro "Historia del Arte Peruano" — Edición ilustrada',
    descripcion: '320 páginas con más de 500 imágenes a color. Desde el arte precolombino hasta el arte contemporáneo peruano. Tapa dura. Edición bilingüe español-inglés.',
    precio: 85.00, stock: 30, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/libro-arte-peruano/400/400'],
  },
  {
    categoria_id: 8,
    nombre: 'Kit de pintura acrílica artística x24 colores — Profesional',
    descripcion: 'Juego de 24 tubos de pintura acrílica 20ml de alta pigmentación. Incluye 3 pinceles y paleta de mezcla. Apto para lienzo, papel y madera. Colores vibrantes.',
    precio: 95.00, stock: 45, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/kit-pintura-acrilica/400/400'],
  },
  {
    categoria_id: 8,
    nombre: 'Pelota de fútbol Kipsta F500 — Talla 5 oficial',
    descripcion: 'Balón oficial talla 5 con cubierta de PU resistente y vejiga de butilo para retención de aire. Apto para canchas de gras natural y sintético. INDOORS / OUTDOORS.',
    precio: 120.00, stock: 55, estado: 'activo', ciudad: 'Lima', vistas: 0,
    imagenes: ['https://picsum.photos/seed/pelota-futbol-kipsta/400/400'],
  },
]

const categorias = {
  1: 'Ropa y Moda', 2: 'Electrónicos', 3: 'Alimentos',
  4: 'Artesanías',  5: 'Hogar',        6: 'Autos y Motos',
  7: 'Agrícola',   8: 'Otros',
}

async function seed() {
  // Limpiar productos anteriores
  console.log('Eliminando productos de prueba anteriores...')
  const { error: delError } = await supabase
    .from('productos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // elimina todos
  if (delError) {
    console.error('Error al eliminar:', delError.message)
    process.exit(1)
  }
  console.log('✓ Productos anteriores eliminados\n')

  // Insertar nueva selección
  console.log(`Insertando ${productos.length} productos...`)
  const { data, error } = await supabase
    .from('productos')
    .insert(productos)
    .select('id, nombre, categoria_id, ciudad, precio')
  if (error) {
    console.error('Error al insertar:', error.message)
    process.exit(1)
  }

  const porCat = {}
  data.forEach((p) => {
    const cat = categorias[p.categoria_id]
    if (!porCat[cat]) porCat[cat] = []
    porCat[cat].push(p)
  })

  console.log(`\n✓ ${data.length} productos insertados:\n`)
  for (const [cat, ps] of Object.entries(porCat)) {
    console.log(`  [${cat}]`)
    ps.forEach((p) => console.log(`    • ${p.nombre} — ${p.ciudad} — S/${p.precio}`))
  }
  console.log('\n¡Seed completado exitosamente!')
}

seed()
