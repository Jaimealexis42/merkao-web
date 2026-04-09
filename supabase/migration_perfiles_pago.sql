-- Migración: columnas de datos de pago en tabla perfiles
-- Ejecutar en Supabase SQL Editor

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS perfiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas de datos de pago
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS nombre_titular  TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banco           TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS num_cuenta      TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cci             TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS yape_plin       TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ   DEFAULT NOW();

COMMENT ON COLUMN perfiles.nombre_titular IS 'Nombre completo del titular de la cuenta bancaria';
COMMENT ON COLUMN perfiles.banco          IS 'Banco: BCP, Interbank, BBVA, Scotiabank, BanBif, Caja Cusco, Otro';
COMMENT ON COLUMN perfiles.num_cuenta     IS 'Número de cuenta bancaria';
COMMENT ON COLUMN perfiles.cci            IS 'Código de Cuenta Interbancario (CCI) — 20 dígitos';
COMMENT ON COLUMN perfiles.yape_plin      IS 'Número de celular registrado en Yape o Plin';

-- RLS: cada usuario solo puede ver y editar su propio perfil
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "perfil_select_own"
  ON perfiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "perfil_insert_own"
  ON perfiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "perfil_update_own"
  ON perfiles FOR UPDATE USING (auth.uid() = id);
