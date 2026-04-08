-- ============================================================
--  MERKAO — Script SQL: Tabla + 20 productos de ejemplo
--  Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

-- ─── 1. CREAR TABLA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT NOT NULL,
  descripcion    TEXT,
  precio         NUMERIC(10, 2) NOT NULL,
  precio_oferta  NUMERIC(10, 2),
  stock          INTEGER NOT NULL DEFAULT 0,
  categoria      TEXT NOT NULL,
  categoria_id   INTEGER,
  condicion      TEXT NOT NULL DEFAULT 'nuevo' CHECK (condicion IN ('nuevo', 'usado')),
  estado         TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  imagen_url     TEXT,
  vendedor_id    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. TRIGGER: actualiza updated_at automáticamente ──────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3. INSERTAR 20 PRODUCTOS ──────────────────────────────
INSERT INTO productos
  (nombre, descripcion, precio, precio_oferta, stock, categoria, categoria_id, condicion, estado, activo, imagen_url, vendedor_id)
VALUES

-- ── ROPA Y MODA (categoria_id = 1) ──────────────────────────
(
  'Chompa de alpaca tejida a mano — Cusco',
  'Chompa 100% alpaca baby, tejida a mano por artesanas de Cusco. Disponible en tallas S, M y L. Colores: azul marino, rojo y natural. Abriga sin pesar.',
  85.00, NULL, 30,
  'Ropa y Moda', 1, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/chompa-alpaca/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Vestido bordado ayacuchano multicolor',
  'Vestido tradicional con bordados florales hechos a mano en Ayacucho. Tela de algodón 100% peruano. Tallas XS-XL. Perfecto para fiestas y eventos.',
  120.00, 95.00, 15,
  'Ropa y Moda', 1, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/vestido-ayacucho/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Polo de algodón pima peruano — Pack x3',
  'Pack de 3 polos de algodón pima peruano extrafino. El tejido más suave del mundo. Colores variados. Tallas S al XXL. Certificado GOTS.',
  65.00, NULL, 80,
  'Ropa y Moda', 1, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/polo-pima/400/400',
  '00000000-0000-0000-0000-000000000001'
),

-- ── ELECTRÓNICOS (categoria_id = 2) ─────────────────────────
(
  'Laptop HP Pavilion 15" Intel Core i5 16GB RAM SSD 512GB',
  'Laptop para trabajo y entretenimiento. Pantalla FHD 15.6", procesador Intel Core i5 12a gen, 16GB RAM DDR4, SSD NVMe 512GB. Windows 11 Home. Garantía 1 año.',
  2499.00, 2899.00, 12,
  'Electrónicos', 2, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/laptop-hp/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Samsung Galaxy A54 5G 128GB — Negro',
  'Smartphone 5G con pantalla Super AMOLED 6.4", cámara triple 50MP, batería 5000mAh, carga rápida 25W. 8GB RAM. Incluye cargador y funda.',
  1199.00, 1399.00, 25,
  'Electrónicos', 2, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/samsung-a54/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Smart TV LG 43" 4K UHD webOS ThinQ AI',
  'Televisor 43 pulgadas resolución 4K, sistema webOS con Netflix, YouTube, Prime. Control por voz ThinQ AI. HDMI x2, USB x2. Soporte incluido.',
  1599.00, 1899.00, 8,
  'Electrónicos', 2, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/smart-tv-lg/400/400',
  '00000000-0000-0000-0000-000000000001'
),

-- ── ALIMENTOS (categoria_id = 3) ────────────────────────────
(
  'Quinua orgánica blanca Puno — 5 kg',
  'Quinua blanca orgánica certificada, cultivada a 3800 msnm en el altiplano puneño. Sin pesticidas. Rica en proteína vegetal (14g/100g). Ideal para cocina saludable.',
  45.00, NULL, 200,
  'Alimentos', 3, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/quinua-puno/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Café especial Villa Rica 500 g — Molido',
  'Café arábica de altura de Villa Rica, Pasco. Notas de chocolate y frutos rojos. Tostado medio. Molido para cafetera de goteo o prensa francesa. 100% peruano.',
  35.00, NULL, 150,
  'Alimentos', 3, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/cafe-villa-rica/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Cacao puro en polvo Amazonas 1 kg — Orgánico',
  'Cacao criollo 100% natural sin azúcar ni aditivos. Producido en San Martín. Certificado orgánico USDA. Ideal para chocolatería, repostería y bebidas.',
  28.00, 35.00, 120,
  'Alimentos', 3, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/cacao-amazonas/400/400',
  '00000000-0000-0000-0000-000000000001'
),

-- ── ARTESANÍAS (categoria_id = 4) ───────────────────────────
(
  'Cuadro shipibo-conibo original 40×60 cm',
  'Obra original pintada a mano por artista shipibo de Ucayali. Motivos geométricos ancestrales sobre tela. Firmado y con certificado de autenticidad. Marco de madera incluido.',
  180.00, NULL, 5,
  'Artesanías', 4, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/cuadro-shipibo/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Cerámica Chulucanas — Jarrón decorativo grande',
  'Jarrón decorativo de cerámica Chulucanas, técnica ancestral de Piura. Motivos preincas en negativo. Pieza única de 35 cm de altura. Declarada Patrimonio Cultural.',
  220.00, NULL, 8,
  'Artesanías', 4, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/ceramica-chulucanas/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Retablo ayacuchano — Escena costumbrista',
  'Retablo de madera tallado y pintado a mano en Huamanga, Ayacucho. Escena de feria campesina con más de 30 figuras. 25×20 cm. Ideal como regalo o decoración.',
  150.00, 180.00, 10,
  'Artesanías', 4, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/retablo-ayacucho/400/400',
  '00000000-0000-0000-0000-000000000001'
),

-- ── HOGAR (categoria_id = 5) ─────────────────────────────────
(
  'Silla gamer ergonómica RGB reclinable 180°',
  'Silla gamer con soporte lumbar y cervical, reclinación hasta 180°, apoyabrazos 4D, luces RGB. Peso máximo 150 kg. Incluye almohada de cuello. Color: negro/rojo.',
  450.00, 599.00, 18,
  'Hogar', 5, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/silla-gamer/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Licuadora Oster Pro 700W — 3 velocidades + pulso',
  'Licuadora de 700W con jarra de vidrio 1.25L resistente a impactos. 3 velocidades + función pulso. Cuchillas de acero inoxidable. Base antideslizante. 2 años de garantía.',
  189.00, 249.00, 35,
  'Hogar', 5, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/licuadora-oster/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Sofá 2 cuerpos — Tela antimanchas gris Oxford',
  'Sofá moderno de 2 cuerpos con estructura de madera maciza y espuma de alta densidad. Tapizado en tela antimanchas fácil de limpiar. 145 cm ancho. Entrega Lima.',
  890.00, 1100.00, 6,
  'Hogar', 5, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/sofa-gris/400/400',
  '00000000-0000-0000-0000-000000000001'
),

-- ── AUTOS Y MOTOS (categoria_id = 6) ────────────────────────
(
  'Moto Honda Wave 110cc Alpha 2024 — Azul',
  'Motocicleta Honda Wave 110cc, modelo 2024. Motor 4 tiempos OHC, freno de disco delantero, arranque eléctrico y a pedal. Rendimiento 55 km/L. SOAT incluido.',
  7500.00, 8200.00, 4,
  'Autos y Motos', 6, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/moto-honda/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Batería Bosch S4 60Ah 12V — Universal',
  'Batería de auto Bosch S4 60Ah 12V 540A arranque en frío. Compatible con la mayoría de vehículos. Sin mantenimiento. Garantía 18 meses. Incluye instalación en Lima.',
  280.00, NULL, 20,
  'Autos y Motos', 6, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/bateria-bosch/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Llanta Bridgestone Ecopia 195/65 R15 — Par',
  'Par de llantas Bridgestone Ecopia 195/65 R15 91H. Bajo consumo de combustible, alta durabilidad. Fabricadas en Japón. Incluye balanceo y montaje en Lima.',
  320.00, NULL, 30,
  'Autos y Motos', 6, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/llantas-bridgestone/400/400',
  '00000000-0000-0000-0000-000000000001'
),

-- ── AGRÍCOLA (categoria_id = 7) ──────────────────────────────
(
  'Motocultor Loncin 7HP a gasolina con accesorios',
  'Motocultor 7HP motor Loncin 4 tiempos a gasolina. Incluye rejas de arado, surcador y cultivador. Ideal para pequeños y medianos agricultores. Garantía 1 año.',
  2800.00, NULL, 7,
  'Agrícola', 7, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/motocultor-loncin/400/400',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Semillas de papa nativa Huancavelica — 5 kg variedad Huayro',
  'Semillas certificadas de papa nativa variedad Huayro, originarias de Huancavelica. Alto rendimiento, resistentes a heladas. Libres de pesticidas. Ideal para 250 m².',
  38.00, NULL, 100,
  'Agrícola', 7, 'nuevo', 'activo', TRUE,
  'https://picsum.photos/seed/semillas-papa/400/400',
  '00000000-0000-0000-0000-000000000001'
);

-- ─── 4. VERIFICAR ──────────────────────────────────────────
SELECT
  id,
  nombre,
  precio,
  categoria,
  categoria_id,
  stock,
  activo
FROM productos
ORDER BY categoria_id, nombre;
