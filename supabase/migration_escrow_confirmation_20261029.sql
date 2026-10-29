-- ESCROW CONFIRMATION FLOW — correr en SQL Editor de Supabase
-- Agrega columna entregado_at, amplía el CHECK de estado, y crea trigger
-- que sincroniza order_tracking 'entregado' → pedidos.entregado_at.

-- 1. Columna para el timer de auto-liberación (7 días desde entrega)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entregado_at TIMESTAMPTZ;

-- 2. Ampliar CHECK de estado para incluir pendiente_pago (ya en uso en el código)
--    Primero eliminamos la constraint con su nombre real.
--    Si la constraint tiene otro nombre, Supabase lo muestra en la pestaña
--    Table Editor → Constraints. Sustituye el nombre si hace falta.
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN (
    'pendiente_pago',
    'pagado',
    'enviado',
    'entregado',
    'liberado',
    'disputado',
    'cancelado'
  ));

-- 3. Función que sincroniza el estado del pedido cuando el vendedor
--    registra el evento 'entregado' en order_tracking.
CREATE OR REPLACE FUNCTION trg_sync_pedido_entregado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'entregado' THEN
    UPDATE pedidos
    SET
      estado       = 'entregado',
      entregado_at = COALESCE(entregado_at, NOW())
    WHERE
      id     = NEW.pedido_id
      AND estado NOT IN ('liberado', 'disputado', 'cancelado');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger sobre order_tracking
DROP TRIGGER IF EXISTS trg_pedido_entregado ON order_tracking;
CREATE TRIGGER trg_pedido_entregado
  AFTER INSERT OR UPDATE ON order_tracking
  FOR EACH ROW EXECUTE FUNCTION trg_sync_pedido_entregado();

-- 5. Notificar al schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
