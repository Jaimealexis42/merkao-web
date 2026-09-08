-- seed_productos_sep2026.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Selección diversa de septiembre 2026 (36 productos, 8 categorías)

INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, estado, ciudad, vistas, imagenes) VALUES

-- ── ROPA Y MODA (cat 1) ─────────────────────────────────────────────────
(1, 'Chompa de alpaca baby tejida a mano — Cusco',
 'Chompa 100% alpaca baby tejida a mano por artesanas de Cusco. Tallas S, M y L. Colores: azul marino, rojo y natural. Abriga sin pesar. Perfecta como regalo de temporada.',
 85.00, 30, 'activo', 'Cusco', 0,
 ARRAY['https://picsum.photos/seed/chompa-alpaca/400/400','https://picsum.photos/seed/chompa-alpaca-2/400/400']),

(1, 'Vestido bordado ayacuchano multicolor',
 'Vestido tradicional con bordados florales hechos a mano en Ayacucho. Algodón 100% peruano. Tallas XS-XL. Perfecto para fiestas y eventos de primavera.',
 120.00, 15, 'activo', 'Ayacucho', 0,
 ARRAY['https://picsum.photos/seed/vestido-ayacucho/400/400']),

(1, 'Blusa de lino artesanal con bordado floral — Arequipa',
 'Blusa de lino 100% con bordados florales hechos a mano en Arequipa. Fresca y ligera, ideal para la primavera. Tallas S, M, L, XL. Colores: blanco y celeste.',
 95.00, 20, 'activo', 'Arequipa', 0,
 ARRAY['https://picsum.photos/seed/blusa-lino-arequipa/400/400']),

(1, 'Camiseta algodón pima estampada — Arte peruano',
 'Camiseta de algodón pima extrafino con estampado artístico de motivos andinos. Unisex. Tallas S al XL. Envío a todo el Perú.',
 45.00, 80, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/camiseta-pima-estampada/400/400']),

(1, 'Chaleco de alpaca reversible — dos colores',
 'Chaleco reversible en alpaca fina con dos acabados: uno liso y uno con textura. Tejido a mano en Cusco. Tallas S, M, L. Colores: gris/mostaza y azul/natural.',
 110.00, 12, 'activo', 'Cusco', 0,
 ARRAY['https://picsum.photos/seed/chaleco-alpaca-reversible/400/400']),

-- ── ELECTRÓNICOS (cat 2) ────────────────────────────────────────────────
(2, 'Laptop HP Pavilion 15" Intel Core i5 16GB SSD 512GB',
 'Pantalla FHD 15.6", procesador Intel Core i5 12a gen, 16GB RAM DDR4, SSD NVMe 512GB. Windows 11 Home. Garantía 1 año.',
 2499.00, 12, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/laptop-hp/400/400','https://picsum.photos/seed/laptop-hp-2/400/400']),

(2, 'Samsung Galaxy A54 5G 128GB — Negro',
 'Pantalla Super AMOLED 6.4", cámara triple 50MP, batería 5000mAh, carga rápida 25W. 8GB RAM. Incluye cargador y funda.',
 1199.00, 25, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/samsung-a54/400/400']),

(2, 'Audífonos Bluetooth JBL Tune 510BT — Blanco',
 'Auriculares inalámbricos over-ear JBL. Batería 40 horas, plegables, conexión multipunto. Compatible con iOS y Android. Incluye cable USB-C.',
 189.00, 40, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/audifonos-jbl/400/400']),

(2, 'Tablet Amazon Fire 7 32GB — Edición 2024',
 'Pantalla 7", 32GB almacenamiento, hasta 10h batería. Acceso a Netflix, Prime Video, Kindle y más. Ideal para niños y entretenimiento en casa.',
 299.00, 18, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/tablet-amazon-fire/400/400']),

-- ── ALIMENTOS (cat 3) ───────────────────────────────────────────────────
(3, 'Quinua orgánica blanca Puno — 5 kg',
 'Quinua blanca orgánica certificada, cultivada a 3800 msnm en el altiplano puneño. Sin pesticidas. 14g de proteína por 100g.',
 45.00, 200, 'activo', 'Puno', 0,
 ARRAY['https://picsum.photos/seed/quinua-puno/400/400']),

(3, 'Café especial Villa Rica 500g — Molido o en grano',
 'Café arábica de altura de Villa Rica, Pasco. Notas de chocolate y frutos rojos. Tostado medio. Para cafetera de goteo, prensa francesa o espresso.',
 35.00, 150, 'activo', 'Pasco', 0,
 ARRAY['https://picsum.photos/seed/cafe-villa-rica/400/400']),

(3, 'Cacao puro en polvo Amazonas 1 kg — Orgánico',
 'Cacao criollo 100% natural sin azúcar ni aditivos. San Martín. Certificado orgánico USDA. Ideal para chocolatería y repostería.',
 28.00, 120, 'activo', 'San Martín', 0,
 ARRAY['https://picsum.photos/seed/cacao-amazonas/400/400']),

(3, 'Miel de abeja silvestre San Martín 1 L — Sin procesar',
 'Miel cruda de abejas silvestres recolectada en la selva alta de San Martín. Sin pasteurizar ni filtrar. Rica en enzimas y antioxidantes naturales.',
 42.00, 90, 'activo', 'San Martín', 0,
 ARRAY['https://picsum.photos/seed/miel-silvestre/400/400']),

(3, 'Maíz morado premium Cusco 1 kg — Origen certificado',
 'Maíz morado seco de Cusco, variedad Kulli. Alto contenido de antocianinas. Ideal para chicha morada, mazamorra y colorante natural. Secado al sol.',
 22.00, 300, 'activo', 'Cusco', 0,
 ARRAY['https://picsum.photos/seed/maiz-morado-cusco/400/400']),

-- ── ARTESANÍAS (cat 4) ──────────────────────────────────────────────────
(4, 'Cuadro shipibo-conibo original 40×60 cm',
 'Obra original pintada a mano por artista shipibo de Ucayali. Motivos geométricos ancestrales sobre tela. Certificado de autenticidad. Marco incluido.',
 180.00, 5, 'activo', 'Ucayali', 0,
 ARRAY['https://picsum.photos/seed/cuadro-shipibo/400/400','https://picsum.photos/seed/cuadro-shipibo-2/400/400']),

(4, 'Cerámica Chulucanas — Jarrón decorativo grande',
 'Jarrón de cerámica Chulucanas, técnica ancestral de Piura. Motivos preincas en negativo. Pieza única de 35 cm. Declarada Patrimonio Cultural.',
 220.00, 8, 'activo', 'Piura', 0,
 ARRAY['https://picsum.photos/seed/ceramica-chulucanas/400/400']),

(4, 'Retablo ayacuchano — Escena costumbrista',
 'Retablo de madera tallado y pintado a mano en Huamanga. Escena de feria campesina con más de 30 figuras. 25×20 cm. Ideal para regalo.',
 150.00, 10, 'activo', 'Ayacucho', 0,
 ARRAY['https://picsum.photos/seed/retablo-ayacucho/400/400']),

(4, 'Joyería de plata filigrana Catacaos — Aretes largos',
 'Aretes de plata 950 con técnica de filigrana de Catacaos, Piura. Artesanía de 200 años de tradición. 7 cm de largo. Incluye estuche de regalo.',
 95.00, 20, 'activo', 'Piura', 0,
 ARRAY['https://picsum.photos/seed/joyeria-catacaos/400/400']),

(4, 'Bolso tejido aguayo multicolor — Puno',
 'Bolso de tela aguayo tejida a mano en Puno con lana de oveja teñida con tintes naturales. 30×25 cm con asa de cuero. Único e irrepetible.',
 130.00, 15, 'activo', 'Puno', 0,
 ARRAY['https://picsum.photos/seed/bolso-aguayo-puno/400/400']),

-- ── HOGAR (cat 5) ───────────────────────────────────────────────────────
(5, 'Silla gamer ergonómica RGB reclinable 180°',
 'Soporte lumbar y cervical, reclinación hasta 180°, apoyabrazos 4D, luces RGB. Peso máximo 150 kg. Incluye almohada de cuello. Color negro/rojo.',
 450.00, 18, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/silla-gamer/400/400','https://picsum.photos/seed/silla-gamer-2/400/400']),

(5, 'Licuadora Oster Pro 700W — 3 velocidades y pulso',
 'Jarra de vidrio 1.25L resistente a impactos. 3 velocidades + función pulso. Cuchillas de acero inoxidable. Base antideslizante. Garantía 2 años.',
 189.00, 35, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/licuadora-oster/400/400']),

(5, 'Set de macetas cerámica andina pintada x3 — Cusco',
 'Juego de 3 macetas de cerámica artesanal pintadas a mano con motivos andinos. Tamaños: 10, 15 y 20 cm. Perfectas para interior y decoración de primavera.',
 120.00, 25, 'activo', 'Cusco', 0,
 ARRAY['https://picsum.photos/seed/macetas-ceramica-andina/400/400']),

(5, 'Set ollas antiadherentes x5 piezas — Mango de madera',
 'Juego de 5 ollas (12, 16, 20, 24 y 28 cm) con revestimiento antiadherente de triple capa y mangos de madera. Apto para todo tipo de cocinas.',
 280.00, 22, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/ollas-antiadherentes/400/400']),

(5, 'Espejo con marco de madera tallada — Ayacucho',
 'Espejo ovalado 60×40 cm con marco de madera tallada y pintada a mano por artesanos de Ayacucho. Motivos florales andinos. Incluye gancho para colgar.',
 210.00, 8, 'activo', 'Ayacucho', 0,
 ARRAY['https://picsum.photos/seed/espejo-tallado-ayacucho/400/400']),

-- ── AUTOS Y MOTOS (cat 6) ───────────────────────────────────────────────
(6, 'Moto Honda Wave 110cc Alpha 2024 — Azul',
 'Motor 4 tiempos OHC, freno de disco delantero, arranque eléctrico y a pedal. Rendimiento 55 km/L. SOAT incluido. Modelo 2024.',
 7500.00, 4, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/moto-honda/400/400','https://picsum.photos/seed/moto-honda-2/400/400']),

(6, 'Batería Bosch S4 60Ah 12V — Universal',
 'Batería 60Ah 12V 540A de arranque en frío. Compatible con la mayoría de vehículos. Sin mantenimiento. Garantía 18 meses.',
 280.00, 20, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/bateria-bosch/400/400']),

(6, 'Llantas Bridgestone Ecopia 195/65 R15 — Par',
 'Par de llantas bajo consumo de combustible y alta durabilidad. Fabricadas en Japón. Incluye balanceo y montaje en Lima.',
 320.00, 30, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/llantas-bridgestone/400/400']),

(6, 'Casco de moto integral certificado DOT/ECE — M/L',
 'Casco integral con certificación DOT y ECE. Visera anti-UV, interior desmontable y lavable. Sistema de ventilación. Colores: negro mate y blanco.',
 185.00, 30, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/casco-moto-dot/400/400']),

-- ── AGRÍCOLA (cat 7) ────────────────────────────────────────────────────
(7, 'Motocultor Loncin 7HP a gasolina con accesorios',
 'Motor Loncin 4 tiempos a gasolina. Incluye rejas de arado, surcador y cultivador. Ideal para pequeños y medianos agricultores. Garantía 1 año.',
 2800.00, 7, 'activo', 'Junín', 0,
 ARRAY['https://picsum.photos/seed/motocultor-loncin/400/400','https://picsum.photos/seed/motocultor-loncin-2/400/400']),

(7, 'Semillas de papa nativa Huayro — Huancavelica 5 kg',
 'Semillas certificadas variedad Huayro de Huancavelica. Alto rendimiento, resistentes a heladas. Libres de pesticidas. Para 250 m².',
 38.00, 100, 'activo', 'Huancavelica', 0,
 ARRAY['https://picsum.photos/seed/semillas-papa/400/400']),

(7, 'Plantines de hierbas aromáticas x6 — Listos para trasplantar',
 'Pack de 6 plantines: albahaca, menta, romero, tomillo, orégano y culantro. Listos para trasplantar en maceta o jardín. Enviamos en caja especial con ventilación.',
 35.00, 60, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/plantines-hierbas/400/400']),

(7, 'Semillas de flores de estación mix peruano — 12 variedades',
 'Mezcla de semillas de flores de temporada: girasol, cosmos, caléndula, zinnia y más. Para jardín y macetas. Instrucciones de siembra incluidas.',
 28.00, 150, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/semillas-flores-mix/400/400']),

-- ── OTROS (cat 8) ───────────────────────────────────────────────────────
(8, 'Mochila escolar artesanal bordada — Cusco',
 'Mochila de lona resistente con bordados andinos hechos a mano en Cusco. Capacidad 20L, bolsillo interior para laptop 13". Tiras acolchadas. Colores variados.',
 145.00, 18, 'activo', 'Cusco', 0,
 ARRAY['https://picsum.photos/seed/mochila-bordada-cusco/400/400']),

(8, 'Libro "Historia del Arte Peruano" — Edición ilustrada',
 '320 páginas con más de 500 imágenes a color. Desde el arte precolombino hasta el contemporáneo. Tapa dura. Edición bilingüe español-inglés.',
 85.00, 30, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/libro-arte-peruano/400/400']),

(8, 'Kit de pintura acrílica artística x24 colores — Profesional',
 'Juego de 24 tubos de pintura acrílica 20ml de alta pigmentación. Incluye 3 pinceles y paleta de mezcla. Apto para lienzo, papel y madera.',
 95.00, 45, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/kit-pintura-acrilica/400/400']),

(8, 'Pelota de fútbol Kipsta F500 — Talla 5 oficial',
 'Balón oficial talla 5 con cubierta de PU resistente y vejiga de butilo para retención de aire. Apto para pasto natural y sintético. INDOORS / OUTDOORS.',
 120.00, 55, 'activo', 'Lima', 0,
 ARRAY['https://picsum.photos/seed/pelota-futbol-kipsta/400/400']);
