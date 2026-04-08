-- Migración: campos de mayoreo, flete y ciudad en productos
-- Ejecutar en Supabase SQL Editor

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_mayoreo         NUMERIC(10,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cantidad_minima_mayoreo INTEGER        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS costo_envio            NUMERIC(10,2)  DEFAULT 0;

-- Agrega categoría 8 "Otros" en los seeds si no existe:
-- UPDATE productos SET categoria_id = 8 WHERE categoria = 'Otros';

COMMENT ON COLUMN productos.precio_mayoreo          IS 'Precio especial al por mayor (opcional)';
COMMENT ON COLUMN productos.cantidad_minima_mayoreo IS 'Cantidad mínima para aplicar precio mayoreo';
COMMENT ON COLUMN productos.costo_envio             IS 'Costo de envío fijo en S/. 0 = acordar con comprador';
