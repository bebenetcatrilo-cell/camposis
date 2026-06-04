-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 08: PRESUPUESTOS
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE estado_presupuesto AS ENUM (
    'pendiente',
    'aprobado',
    'rechazado',
    'facturado'      -- cuando se convierte a factura (futuro)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) TABLA presupuestos (encabezado)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  -- Identificación
  numero INTEGER NOT NULL,           -- 1, 2, 3... (se muestra como 0001)
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,            -- opcional: hasta cuándo es válido

  -- Cliente (snapshot de datos por si después se edita el cliente)
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_cuit TEXT,
  cliente_condicion_iva TEXT,
  cliente_direccion TEXT,
  cliente_localidad TEXT,

  -- Concepto / descripción general
  concepto TEXT,

  -- Totales (calculados al guardar)
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 0,
  iva_monto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Estado y notas
  estado estado_presupuesto NOT NULL DEFAULT 'pendiente',
  notas TEXT,

  -- Tracking
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un presupuesto por número por productor
  UNIQUE (productor_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_productor ON presupuestos(productor_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_fecha ON presupuestos(fecha DESC);

DROP TRIGGER IF EXISTS set_updated_at_presupuestos ON presupuestos;
CREATE TRIGGER set_updated_at_presupuestos
  BEFORE UPDATE ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 3) TABLA items_presupuesto (renglones)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items_presupuesto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,

  -- Producto del catálogo (opcional - puede ser ítem libre)
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,

  -- Snapshot (por si el producto cambia o se elimina después)
  descripcion TEXT NOT NULL,
  unidad TEXT,              -- 'tn', 'kg', 'cabezas', etc.

  -- Cantidades y precios
  cantidad NUMERIC(15, 3) NOT NULL CHECK (cantidad >= 0),
  precio_unitario NUMERIC(15, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(15, 2) NOT NULL,    -- cantidad * precio_unitario

  orden INTEGER NOT NULL DEFAULT 0,    -- para ordenar los renglones
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_pres_presupuesto ON items_presupuesto(presupuesto_id);


-- ─────────────────────────────────────────────────────────────
-- 4) FUNCIÓN: siguiente número de presupuesto por productor
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION siguiente_numero_presupuesto(p_productor_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(numero), 0) + 1
  FROM presupuestos
  WHERE productor_id = p_productor_id;
$$;


-- ─────────────────────────────────────────────────────────────
-- 5) RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presupuestos_select" ON presupuestos;
CREATE POLICY "presupuestos_select" ON presupuestos FOR SELECT
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "presupuestos_insert" ON presupuestos;
CREATE POLICY "presupuestos_insert" ON presupuestos FOR INSERT
WITH CHECK (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "presupuestos_update" ON presupuestos;
CREATE POLICY "presupuestos_update" ON presupuestos FOR UPDATE
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "presupuestos_delete" ON presupuestos;
CREATE POLICY "presupuestos_delete" ON presupuestos FOR DELETE
USING (es_super_admin() OR es_admin_del_productor(productor_id));

ALTER TABLE items_presupuesto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_pres_select" ON items_presupuesto;
CREATE POLICY "items_pres_select" ON items_presupuesto FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.id = items_presupuesto.presupuesto_id
      AND (es_super_admin() OR es_miembro_del_productor(p.productor_id))
  )
);

DROP POLICY IF EXISTS "items_pres_insert" ON items_presupuesto;
CREATE POLICY "items_pres_insert" ON items_presupuesto FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.id = items_presupuesto.presupuesto_id
      AND (es_super_admin() OR es_miembro_del_productor(p.productor_id))
  )
);

DROP POLICY IF EXISTS "items_pres_update" ON items_presupuesto;
CREATE POLICY "items_pres_update" ON items_presupuesto FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.id = items_presupuesto.presupuesto_id
      AND (es_super_admin() OR es_miembro_del_productor(p.productor_id))
  )
);

DROP POLICY IF EXISTS "items_pres_delete" ON items_presupuesto;
CREATE POLICY "items_pres_delete" ON items_presupuesto FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.id = items_presupuesto.presupuesto_id
      AND (es_super_admin() OR es_miembro_del_productor(p.productor_id))
  )
);


-- ─────────────────────────────────────────────────────────────
-- 6) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  'presupuestos' AS tabla, COUNT(*) AS filas FROM presupuestos
UNION ALL SELECT 'items_presupuesto', COUNT(*) FROM items_presupuesto;
