-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 17: REMITOS
-- Remito puro: comprobante de entrega. Solo cantidades (sin precio),
-- NO toca stock. Puede generarse desde una factura o crearse a mano.
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUM estado_remito
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE estado_remito AS ENUM (
    'borrador',  -- en preparación
    'emitido',   -- emitido / entregado
    'anulado'    -- anulado
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) TABLA remitos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS remitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  punto_venta TEXT NOT NULL DEFAULT '0001',
  numero INTEGER NOT NULL,                 -- 1, 2, 3... (se muestra 00000001)
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Cliente (snapshot)
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_cuit TEXT,
  cliente_direccion TEXT,
  cliente_localidad TEXT,

  -- Origen (opcional, si viene de una factura)
  factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,

  -- Datos de entrega (opcionales)
  transporte TEXT,                         -- transportista / patente / chofer
  observaciones TEXT,

  estado estado_remito NOT NULL DEFAULT 'borrador',

  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (productor_id, punto_venta, numero)
);

CREATE INDEX IF NOT EXISTS idx_remitos_productor ON remitos(productor_id);
CREATE INDEX IF NOT EXISTS idx_remitos_cliente ON remitos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_remitos_factura ON remitos(factura_id);
CREATE INDEX IF NOT EXISTS idx_remitos_fecha ON remitos(fecha DESC);

DROP TRIGGER IF EXISTS set_updated_at_remitos ON remitos;
CREATE TRIGGER set_updated_at_remitos
  BEFORE UPDATE ON remitos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3) TABLA items_remito (sin precios, solo cantidades)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items_remito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remito_id UUID NOT NULL REFERENCES remitos(id) ON DELETE CASCADE,

  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  unidad TEXT,
  cantidad NUMERIC(15, 3) NOT NULL CHECK (cantidad >= 0),

  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_remito_remito ON items_remito(remito_id);

-- ─────────────────────────────────────────────────────────────
-- 4) FUNCIÓN: siguiente número por punto_venta
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION siguiente_numero_remito(
  p_productor_id UUID,
  p_punto_venta TEXT
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(numero), 0) + 1
  FROM remitos
  WHERE productor_id = p_productor_id
    AND punto_venta = p_punto_venta;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5) RLS POLICIES (mismo patrón que facturas)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE remitos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "remitos_select" ON remitos;
CREATE POLICY "remitos_select" ON remitos FOR SELECT
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "remitos_insert" ON remitos;
CREATE POLICY "remitos_insert" ON remitos FOR INSERT
WITH CHECK (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "remitos_update" ON remitos;
CREATE POLICY "remitos_update" ON remitos FOR UPDATE
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "remitos_delete" ON remitos;
CREATE POLICY "remitos_delete" ON remitos FOR DELETE
USING (es_super_admin() OR es_admin_del_productor(productor_id));

ALTER TABLE items_remito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_remito_select" ON items_remito;
CREATE POLICY "items_remito_select" ON items_remito FOR SELECT
USING (EXISTS (SELECT 1 FROM remitos r WHERE r.id = items_remito.remito_id
  AND (es_super_admin() OR es_miembro_del_productor(r.productor_id))));

DROP POLICY IF EXISTS "items_remito_insert" ON items_remito;
CREATE POLICY "items_remito_insert" ON items_remito FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM remitos r WHERE r.id = items_remito.remito_id
  AND (es_super_admin() OR es_miembro_del_productor(r.productor_id))));

DROP POLICY IF EXISTS "items_remito_update" ON items_remito;
CREATE POLICY "items_remito_update" ON items_remito FOR UPDATE
USING (EXISTS (SELECT 1 FROM remitos r WHERE r.id = items_remito.remito_id
  AND (es_super_admin() OR es_miembro_del_productor(r.productor_id))));

DROP POLICY IF EXISTS "items_remito_delete" ON items_remito;
CREATE POLICY "items_remito_delete" ON items_remito FOR DELETE
USING (EXISTS (SELECT 1 FROM remitos r WHERE r.id = items_remito.remito_id
  AND (es_super_admin() OR es_miembro_del_productor(r.productor_id))));

-- ─────────────────────────────────────────────────────────────
-- 6) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT 'remitos' AS tabla, COUNT(*) AS filas FROM remitos
UNION ALL SELECT 'items_remito', COUNT(*) FROM items_remito;
