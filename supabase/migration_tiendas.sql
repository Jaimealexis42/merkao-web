-- Migración: tabla pública de tiendas (perfil de vendedor)
-- Ejecutar en Supabase SQL Editor.
--
-- Se separa de `perfiles` para evitar que columnas privadas (banco, CCI, etc.)
-- queden expuestas vía la policy pública de lectura que requiere la storefront.

CREATE TABLE IF NOT EXISTS tiendas (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT          DEFAULT NULL,
  descripcion   TEXT          DEFAULT NULL,
  logo_url      TEXT          DEFAULT NULL,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON COLUMN tiendas.nombre      IS 'Nombre público de la tienda del vendedor';
COMMENT ON COLUMN tiendas.descripcion IS 'Descripción breve de la tienda — visible para compradores';
COMMENT ON COLUMN tiendas.logo_url    IS 'URL pública del logo de la tienda';

ALTER TABLE tiendas ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cualquiera puede ver la información de la tienda.
CREATE POLICY IF NOT EXISTS "tienda_select_public"
  ON tiendas FOR SELECT USING (true);

-- Escritura: solo el dueño puede insertar/actualizar su propia tienda.
CREATE POLICY IF NOT EXISTS "tienda_insert_own"
  ON tiendas FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "tienda_update_own"
  ON tiendas FOR UPDATE USING (auth.uid() = id);
