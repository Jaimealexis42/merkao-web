-- YA APLICADA EL 29-10-2026 DESDE EL SQL EDITOR. NO VOLVER A CORRER.
--
-- Escrow confirmation flow: timer de auto-liberación, CHECK de estado ampliado,
-- y trigger que sincroniza order_tracking 'entregado' → pedidos.entregado_at.

-- 0. Chequeo de seguridad: aborta si order_tracking no tiene las columnas
--    esperadas por el trigger (pedido_id, estado).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.order_tracking'::regclass
      AND attname   = 'pedido_id'
      AND attnum    > 0
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'order_tracking.pedido_id no existe — abortando migración';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.order_tracking'::regclass
      AND attname   = 'estado'
      AND attnum    > 0
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'order_tracking.estado no existe — abortando migración';
  END IF;
END
$$;

-- 1. Columna para el timer de auto-liberación (7 días desde entrega)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS entregado_at TIMESTAMPTZ;

-- 2. Ampliar CHECK de estado para incluir pendiente_pago (ya en uso en el código).
--    El nombre de la constraint puede variar; Supabase lo muestra en
--    Table Editor → Constraints si hace falta confirmarlo.
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN (
    'pendiente_pago',
    'pagado',
    'enviado',
    'entregado',
    'liberado',
    'disputado',
    'cancelado'
  ));

-- 3. Función del trigger.
--    SECURITY DEFINER + search_path fijo evitan ataques de sustitución de
--    esquema. Solo avanza si el pedido está en 'pagado' o 'enviado', para
--    que un evento de entrega no pueda "desbloquear" un pedido sin pagar.
CREATE OR REPLACE FUNCTION public.trg_sync_pedido_entregado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'entregado' THEN
    UPDATE public.pedidos
    SET
      estado       = 'entregado',
      entregado_at = COALESCE(entregado_at, NOW())
    WHERE
      id     = NEW.pedido_id
      AND estado IN ('pagado', 'enviado');   -- solo pedidos activos y sin pagar no aplica
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Trigger sobre order_tracking
DROP TRIGGER IF EXISTS trg_pedido_entregado ON public.order_tracking;
CREATE TRIGGER trg_pedido_entregado
  AFTER INSERT OR UPDATE ON public.order_tracking
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_pedido_entregado();

-- 5. Notificar al schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
