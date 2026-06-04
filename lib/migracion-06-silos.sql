-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 07: SILOS (MVP)
-- Stock por silo × producto × campaña
-- Movimientos: entrada y salida
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tipo_silo AS ENUM (
    'aereo',           -- silo aéreo (chapa, hormigón)
    'bolsa',           -- silo bolsa
    'galpon',          -- galpón / depósito
    'tercero',         -- depositado en acopio o tercero
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_movimiento_silo AS ENUM (
    'entrada',  -- ingreso de cereal
    'salida'    -- retiro/venta
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────
-- 2) TABLA silos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS silos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  nombre TEXT NOT NULL,
  tipo tipo_silo NOT NULL DEFAULT 'aereo',
  ubicacion TEXT,           -- "Lote 5", "Casa central", etc.
  capacidad_tn NUMERIC(15, 2),  -- capacidad en toneladas (opcional)
  observaciones TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (productor_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_silos_productor ON silos(productor_id);
CREATE INDEX IF NOT EXISTS idx_silos_activo ON silos(activo);

DROP TRIGGER IF EXISTS set_updated_at_silos ON silos;
CREATE TRIGGER set_updated_at_silos
  BEFORE UPDATE ON silos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 3) TABLA movimientos_silo
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos_silo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,

  tipo tipo_movimiento_silo NOT NULL,
  cantidad_tn NUMERIC(15, 3) NOT NULL CHECK (cantidad_tn > 0),
  campania TEXT,            -- "2024/25"
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,

  observaciones TEXT,
  registrado_por UUID REFERENCES perfiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_silo_productor ON movimientos_silo(productor_id);
CREATE INDEX IF NOT EXISTS idx_mov_silo_silo ON movimientos_silo(silo_id);
CREATE INDEX IF NOT EXISTS idx_mov_silo_producto ON movimientos_silo(producto_id);
CREATE INDEX IF NOT EXISTS idx_mov_silo_fecha ON movimientos_silo(fecha DESC);


-- ─────────────────────────────────────────────────────────────
-- 4) VISTA stock_silos (calcula stock actual)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW stock_silos AS
SELECT
  s.id AS silo_id,
  s.productor_id,
  s.nombre AS silo_nombre,
  p.id AS producto_id,
  p.nombre AS producto_nombre,
  p.tipo AS producto_tipo,
  COALESCE(m.campania, '—') AS campania,
  SUM(
    CASE
      WHEN m.tipo = 'entrada' THEN m.cantidad_tn
      WHEN m.tipo = 'salida' THEN -m.cantidad_tn
      ELSE 0
    END
  ) AS stock_actual_tn
FROM silos s
JOIN movimientos_silo m ON m.silo_id = s.id
JOIN productos p ON p.id = m.producto_id
GROUP BY s.id, s.productor_id, s.nombre, p.id, p.nombre, p.tipo, m.campania
HAVING SUM(
  CASE
    WHEN m.tipo = 'entrada' THEN m.cantidad_tn
    WHEN m.tipo = 'salida' THEN -m.cantidad_tn
    ELSE 0
  END
) <> 0;

-- Vista total por silo (sumando todo)
CREATE OR REPLACE VIEW stock_silos_total AS
SELECT
  s.id AS silo_id,
  s.productor_id,
  SUM(
    CASE
      WHEN m.tipo = 'entrada' THEN m.cantidad_tn
      WHEN m.tipo = 'salida' THEN -m.cantidad_tn
      ELSE 0
    END
  ) AS stock_total_tn
FROM silos s
LEFT JOIN movimientos_silo m ON m.silo_id = s.id
GROUP BY s.id, s.productor_id;


-- ─────────────────────────────────────────────────────────────
-- 5) RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE silos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "silos_select" ON silos;
CREATE POLICY "silos_select" ON silos FOR SELECT
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "silos_insert" ON silos;
CREATE POLICY "silos_insert" ON silos FOR INSERT
WITH CHECK (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "silos_update" ON silos;
CREATE POLICY "silos_update" ON silos FOR UPDATE
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "silos_delete" ON silos;
CREATE POLICY "silos_delete" ON silos FOR DELETE
USING (es_super_admin() OR es_admin_del_productor(productor_id));

ALTER TABLE movimientos_silo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mov_silo_select" ON movimientos_silo;
CREATE POLICY "mov_silo_select" ON movimientos_silo FOR SELECT
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "mov_silo_insert" ON movimientos_silo;
CREATE POLICY "mov_silo_insert" ON movimientos_silo FOR INSERT
WITH CHECK (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "mov_silo_update" ON movimientos_silo;
CREATE POLICY "mov_silo_update" ON movimientos_silo FOR UPDATE
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "mov_silo_delete" ON movimientos_silo;
CREATE POLICY "mov_silo_delete" ON movimientos_silo FOR DELETE
USING (es_super_admin() OR es_admin_del_productor(productor_id));


-- ─────────────────────────────────────────────────────────────
-- 6) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  'silos' AS tabla, COUNT(*) AS filas FROM silos
UNION ALL SELECT 'movimientos_silo', COUNT(*) FROM movimientos_silo;
