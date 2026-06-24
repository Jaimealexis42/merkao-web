-- Libro de Reclamaciones Virtual (Indecopi — Anexo I del Reglamento, Ley 29571)
-- Marketplaces obligados desde Ley 32495 (nov 2025) y Casación 20463-2022-Lima.
-- Retención mínima: 2 años. Multas: 1 a 450 UIT.

-- ── Correlativo por año (MERKAO-2026-00001, ...).
-- Una secuencia por año garantiza el formato exigido sin tener que parsear el
-- código en el cliente. Se crea on-demand al primer reclamo del año.
CREATE TABLE IF NOT EXISTS reclamaciones_correlativo (
  anio         INTEGER PRIMARY KEY,
  ultimo       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reclamaciones (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                   TEXT         NOT NULL UNIQUE,           -- MERKAO-2026-00001
  fecha_reclamo            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Consumidor
  consumidor_nombre        TEXT         NOT NULL,
  consumidor_documento_tipo TEXT        NOT NULL CHECK (consumidor_documento_tipo IN ('DNI','CE','PASAPORTE')),
  consumidor_documento_num  TEXT        NOT NULL,
  consumidor_domicilio     TEXT         NOT NULL,
  consumidor_telefono      TEXT         NOT NULL,
  consumidor_email         TEXT         NOT NULL,
  consumidor_es_menor      BOOLEAN      NOT NULL DEFAULT FALSE,
  apoderado_nombre         TEXT         NULL,
  apoderado_documento      TEXT         NULL,

  -- Bien contratado
  bien_tipo                TEXT         NOT NULL CHECK (bien_tipo IN ('PRODUCTO','SERVICIO')),
  bien_monto               NUMERIC(12,2) NOT NULL DEFAULT 0,
  bien_descripcion         TEXT         NOT NULL,

  -- Detalle
  tipo                     TEXT         NOT NULL CHECK (tipo IN ('RECLAMO','QUEJA')),
  detalle                  TEXT         NOT NULL,
  pedido_consumidor        TEXT         NOT NULL,

  -- Trazabilidad
  ip                       TEXT         NULL,
  user_agent               TEXT         NULL,

  -- Estado interno (gestión por Merkao)
  estado                   TEXT         NOT NULL DEFAULT 'recibido'
    CHECK (estado IN ('recibido','en_atencion','resuelto','desestimado')),
  respuesta                TEXT         NULL,
  respondido_en            TIMESTAMPTZ  NULL,

  -- Email de constancia
  constancia_enviada       BOOLEAN      NOT NULL DEFAULT FALSE,
  constancia_enviada_en    TIMESTAMPTZ  NULL,
  constancia_error         TEXT         NULL,

  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reclamaciones_fecha_idx  ON reclamaciones (fecha_reclamo DESC);
CREATE INDEX IF NOT EXISTS reclamaciones_email_idx  ON reclamaciones (consumidor_email);
CREATE INDEX IF NOT EXISTS reclamaciones_estado_idx ON reclamaciones (estado);

-- ── Generador de código atómico. Devuelve "MERKAO-YYYY-NNNNN".
-- Uso: SELECT siguiente_codigo_reclamacion();
CREATE OR REPLACE FUNCTION siguiente_codigo_reclamacion()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_anio INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_num  INTEGER;
BEGIN
  INSERT INTO reclamaciones_correlativo (anio, ultimo)
  VALUES (v_anio, 1)
  ON CONFLICT (anio) DO UPDATE
    SET ultimo = reclamaciones_correlativo.ultimo + 1
  RETURNING ultimo INTO v_num;

  RETURN 'MERKAO-' || v_anio::TEXT || '-' || LPAD(v_num::TEXT, 5, '0');
END;
$$;

-- ── RLS: el público NO puede leer reclamos (datos personales). Solo escribir
-- desde el endpoint server-side (que usa service_role, bypass RLS). El admin
-- de Merkao consulta vía Supabase Studio o un panel autenticado.
ALTER TABLE reclamaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclamaciones_correlativo ENABLE ROW LEVEL SECURITY;
-- Sin policies = denegar todo para anon/authenticated. service_role bypassea.

-- ── Retención: el Reglamento exige conservar reclamos al menos 2 años.
-- NO ponemos auto-delete; un job manual mensual revisa > 2 años antes de
-- archivar a almacenamiento frío. Por ahora solo dejamos índice para auditar.
COMMENT ON TABLE reclamaciones IS
  'Libro de Reclamaciones Virtual (Indecopi). Retención mínima: 2 años. No eliminar sin archivar.';
