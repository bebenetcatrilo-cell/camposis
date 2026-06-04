-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 05: PRODUCTOS (cereal + hacienda)
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tipo_producto AS ENUM ('cereal', 'hacienda');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE unidad_medida AS ENUM ('tn', 'kg', 'qq', 'cabezas');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sexo_hacienda AS ENUM ('macho', 'hembra', 'mixto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) TABLA productos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  -- Datos comunes
  tipo tipo_producto NOT NULL,
  nombre TEXT NOT NULL,
  unidad unidad_medida NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  observaciones TEXT,

  -- Campos específicos de CEREAL
  especie TEXT,             -- "Soja", "Trigo", "Maíz", etc.
  variedad TEXT,            -- variedad/cultivar específico
  campania TEXT,            -- "2024/25", "2025/26"
  grado TEXT,               -- "1", "2", "Cámara", etc.

  -- Campos específicos de HACIENDA
  categoria TEXT,           -- "Ternero", "Novillo", "Vaca", etc.
  raza TEXT,                -- "Angus", "Hereford", "Brangus", etc.
  sexo sexo_hacienda,
  edad_aprox_meses INTEGER,
  peso_promedio_kg NUMERIC(10,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(productor_id, nombre, tipo)
);

CREATE INDEX IF NOT EXISTS idx_productos_productor ON productos(productor_id);
CREATE INDEX IF NOT EXISTS idx_productos_tipo ON productos(tipo);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_productos ON productos;
CREATE TRIGGER set_updated_at_productos
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3) RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_select" ON productos;
CREATE POLICY "productos_select" ON productos FOR SELECT
USING (
  es_super_admin()
  OR es_miembro_del_productor(productor_id)
);

DROP POLICY IF EXISTS "productos_insert" ON productos;
CREATE POLICY "productos_insert" ON productos FOR INSERT
WITH CHECK (
  es_super_admin()
  OR es_miembro_del_productor(productor_id)
);

DROP POLICY IF EXISTS "productos_update" ON productos;
CREATE POLICY "productos_update" ON productos FOR UPDATE
USING (
  es_super_admin()
  OR es_miembro_del_productor(productor_id)
);

DROP POLICY IF EXISTS "productos_delete" ON productos;
CREATE POLICY "productos_delete" ON productos FOR DELETE
USING (
  es_super_admin()
  OR es_admin_del_productor(productor_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4) FUNCIÓN: cargar catálogo default a un productor
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cargar_catalogo_default(p_productor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ─── CEREAL ───
  INSERT INTO productos (productor_id, tipo, nombre, unidad, especie, campania, grado)
  VALUES
    (p_productor_id, 'cereal', 'Soja', 'tn', 'Soja', '2024/25', 'Cámara'),
    (p_productor_id, 'cereal', 'Trigo', 'tn', 'Trigo', '2024/25', 'Cámara'),
    (p_productor_id, 'cereal', 'Maíz', 'tn', 'Maíz', '2024/25', 'Cámara'),
    (p_productor_id, 'cereal', 'Girasol', 'tn', 'Girasol', '2024/25', 'Cámara'),
    (p_productor_id, 'cereal', 'Sorgo', 'tn', 'Sorgo', '2024/25', 'Cámara'),
    (p_productor_id, 'cereal', 'Cebada cervecera', 'tn', 'Cebada', '2024/25', 'Cervecera'),
    (p_productor_id, 'cereal', 'Avena', 'tn', 'Avena', '2024/25', NULL),
    (p_productor_id, 'cereal', 'Lino', 'tn', 'Lino', '2024/25', NULL)
  ON CONFLICT (productor_id, nombre, tipo) DO NOTHING;

  -- ─── HACIENDA ───
  INSERT INTO productos (productor_id, tipo, nombre, unidad, categoria, sexo, edad_aprox_meses, peso_promedio_kg)
  VALUES
    (p_productor_id, 'hacienda', 'Ternero', 'cabezas', 'Ternero', 'macho', 8, 180),
    (p_productor_id, 'hacienda', 'Ternera', 'cabezas', 'Ternera', 'hembra', 8, 170),
    (p_productor_id, 'hacienda', 'Novillito', 'cabezas', 'Novillito', 'macho', 14, 320),
    (p_productor_id, 'hacienda', 'Novillo', 'cabezas', 'Novillo', 'macho', 24, 450),
    (p_productor_id, 'hacienda', 'Vaquillona', 'cabezas', 'Vaquillona', 'hembra', 18, 350),
    (p_productor_id, 'hacienda', 'Vaca', 'cabezas', 'Vaca', 'hembra', 60, 480),
    (p_productor_id, 'hacienda', 'Toro', 'cabezas', 'Toro', 'macho', 36, 750),
    (p_productor_id, 'hacienda', 'Recría', 'cabezas', 'Recría', 'mixto', 12, 280)
  ON CONFLICT (productor_id, nombre, tipo) DO NOTHING;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5) TRIGGER: al crear productor, cargar catálogo automáticamente
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_cargar_catalogo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM cargar_catalogo_default(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_cargar_catalogo_productores ON productores;
CREATE TRIGGER auto_cargar_catalogo_productores
  AFTER INSERT ON productores
  FOR EACH ROW EXECUTE FUNCTION trigger_cargar_catalogo();

-- ─────────────────────────────────────────────────────────────
-- 6) CARGAR catálogo para productores YA EXISTENTES
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN SELECT id FROM productores LOOP
    PERFORM cargar_catalogo_default(p.id);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  prod.nombre AS productor,
  COUNT(*) FILTER (WHERE p.tipo = 'cereal') AS productos_cereal,
  COUNT(*) FILTER (WHERE p.tipo = 'hacienda') AS productos_hacienda,
  COUNT(*) AS total
FROM productores prod
LEFT JOIN productos p ON p.productor_id = prod.id
GROUP BY prod.id, prod.nombre
ORDER BY prod.nombre;

-- Resultado esperado: cada productor con 8 cereales + 8 hacienda = 16 productos
