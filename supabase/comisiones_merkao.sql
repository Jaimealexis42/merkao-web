-- ============================================================
--  MERKAO — Ledger de split de pagos (3/5/7% por categoría)
--  Ejecutar en: Supabase > SQL Editor > New query
--
--  Flujo:
--    1. Comprador paga total con Culqi (100% va a cuenta Merkao).
--    2. /api/culqi-charge INSERTa fila con estado='pendiente'.
--    3. Comprador confirma entrega → /api/confirmar-entrega marca
--       estado='liberado'. Ese monto_vendedor queda listo para
--       transferir off-platform al vendedor.
--    4. Panel /admin/comisiones consulta la tabla (service_role).
--
--  RLS: enabled sin policies. NADIE con anon/authenticated key puede
--  leer ni escribir; solo el service_role server-side accede.
-- ============================================================

CREATE TABLE IF NOT EXISTS comisiones_merkao (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id       uuid        REFERENCES pedidos(id),
  monto_total     numeric     NOT NULL,
  monto_merkao    numeric     NOT NULL,
  monto_vendedor  numeric     NOT NULL,
  estado          text        DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','liberado')),
  created_at      timestamptz DEFAULT now()
);

-- Índices: el UPDATE va por pedido_id, el panel admin filtra por estado.
CREATE INDEX IF NOT EXISTS idx_comisiones_pedido_id
  ON comisiones_merkao(pedido_id);

CREATE INDEX IF NOT EXISTS idx_comisiones_estado_created
  ON comisiones_merkao(estado, created_at DESC);

-- RLS sin policies → solo service_role.
ALTER TABLE comisiones_merkao ENABLE ROW LEVEL SECURITY;
