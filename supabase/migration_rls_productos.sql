-- Activa Row Level Security en tabla productos.
-- SELECT: público ve activos; vendedor ve los suyos (activos + pausados).
-- INSERT/UPDATE/DELETE: solo el dueño (vendedor_id = auth.uid()).

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "productos_select_public"
  ON productos FOR SELECT
  USING (estado = 'activo' OR auth.uid() = vendedor_id);

CREATE POLICY "productos_insert_own"
  ON productos FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "productos_update_own"
  ON productos FOR UPDATE
  USING (auth.uid() = vendedor_id);

CREATE POLICY "productos_delete_own"
  ON productos FOR DELETE
  USING (auth.uid() = vendedor_id);
