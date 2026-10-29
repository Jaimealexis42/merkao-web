-- YA APLICADA EL 29-10-2026 DESDE EL SQL EDITOR. NO VOLVER A CORRER.
--
-- Objetivo: permitir pedidos de invitados (guest checkout) sin comprador_id,
--           agregar columna notas a pedidos, y agregar snapshot de nombre/imagen
--           a pedido_items para historial independiente del catálogo.

-- 1. comprador_id puede ser NULL (guest checkout sin sesión)
ALTER TABLE pedidos
  ALTER COLUMN comprador_id DROP NOT NULL;

-- 2. notas del comprador (instrucciones de entrega, etc.)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS notas TEXT;

-- 3. Snapshot del nombre del producto al momento del pago
ALTER TABLE pedido_items
  ADD COLUMN IF NOT EXISTS nombre_producto TEXT;

-- 4. Snapshot de la primera imagen del producto al momento del pago
ALTER TABLE pedido_items
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 5. Refrescar el schema cache de PostgREST para que vea las columnas nuevas
NOTIFY pgrst, 'reload schema';
