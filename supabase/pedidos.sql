-- ============================================================
--  MERKAO — Tabla pedidos (sistema escrow)
--  Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

CREATE TABLE IF NOT EXISTS pedidos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id       UUID        NOT NULL REFERENCES productos(id),
  nombre_comprador  TEXT        NOT NULL,
  email_comprador   TEXT        NOT NULL,
  telefono          TEXT,
  direccion         TEXT,
  pais_comprador    TEXT        NOT NULL DEFAULT 'PE',
  monto_base        NUMERIC(10,2) NOT NULL,
  monto_igv         NUMERIC(10,2) NOT NULL,
  monto_arancel     NUMERIC(10,2) NOT NULL DEFAULT 0,
  monto_total       NUMERIC(10,2) NOT NULL,
  metodo_pago       TEXT        NOT NULL DEFAULT 'escrow',
  estado            TEXT        NOT NULL DEFAULT 'pagado'
    CHECK (estado IN ('pagado','enviado','entregado','liberado','disputado','cancelado')),
  escrow_liberado   BOOLEAN     NOT NULL DEFAULT FALSE,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON pedidos;
CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_pedidos_producto  ON pedidos(producto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_email     ON pedidos(email_comprador);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado    ON pedidos(estado);
