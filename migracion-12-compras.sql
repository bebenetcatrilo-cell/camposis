-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 12: Compras a Proveedores
-- ═══════════════════════════════════════════════════════════

-- Enum estado de compra
DO $$ BEGIN
  CREATE TYPE estado_compra AS ENUM (
    'pagada',
    'pendiente',
    'parcial',
    'anulada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum forma de pago
DO $$ BEGIN
  CREATE TYPE forma_pago_compra AS ENUM (
    'efectivo',
    'transferencia',
    'cheque',
    'tarjeta',
    'cuenta_corriente',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla compras (cabecera)
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,

  -- Documento
  numero_factura TEXT,         -- Nº de la factura del proveedor (ej: A-0001-00012345)
  tipo_comprobante TEXT,        -- A, B, C, etc. (opcional)
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,       -- Para "pendiente"

  -- Snapshot del proveedor (por si cambia o se borra)
  proveedor_nombre TEXT NOT NULL,
  proveedor_cuit TEXT,

  -- Importes
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  iva_monto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Pago
  forma_pago forma_pago_compra NOT NULL DEFAULT 'efectivo',
  estado estado_compra NOT NULL DEFAULT 'pagada',
  monto_pagado NUMERIC(15, 2) NOT NULL DEFAULT 0,

  notas TEXT,
  creado_por UUID REFERENCES perfiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla items de compra
CREATE TABLE IF NOT EXISTS items_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,

  -- Descripción libre del item
  descripcion TEXT NOT NULL,
  unidad TEXT,                  -- kg, tn, L, u, hs, etc.
  cantidad NUMERIC(15, 3) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(15, 2) NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 21,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  iva_monto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- ── Vinculación a stock (opcional) ──
  suma_stock BOOLEAN NOT NULL DEFAULT FALSE,
  silo_id UUID REFERENCES silos(id) ON DELETE SET NULL,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  movimiento_silo_id UUID REFERENCES movimientos_silo(id) ON DELETE SET NULL,
  campania TEXT,                -- Si va a silo

  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_compras_productor ON compras(productor_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(productor_id, estado);
CREATE INDEX IF NOT EXISTS idx_items_compra_compra ON items_compra(compra_id);
CREATE INDEX IF NOT EXISTS idx_items_compra_silo ON items_compra(silo_id) WHERE silo_id IS NOT NULL;

-- RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_compra ENABLE ROW LEVEL SECURITY;

-- compras: super admins
DROP POLICY IF EXISTS "compras_super_admin_all" ON compras;
CREATE POLICY "compras_super_admin_all" ON compras
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM perfiles p
    WHERE p.id = auth.uid()
      AND p.rol_perfil = 'super_admin'
      AND p.activo = true
  )
);

-- compras: miembros ven
DROP POLICY IF EXISTS "compras_member_select" ON compras;
CREATE POLICY "compras_member_select" ON compras
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM miembros m
    WHERE m.productor_id = compras.productor_id
      AND m.perfil_id = auth.uid()
      AND m.activo = true
  )
);

-- compras: admins editan
DROP POLICY IF EXISTS "compras_admin_write" ON compras;
CREATE POLICY "compras_admin_write" ON compras
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM miembros m
    WHERE m.productor_id = compras.productor_id
      AND m.perfil_id = auth.uid()
      AND m.rol = 'admin_productor'
      AND m.activo = true
  )
);

-- items_compra: heredan via compras
DROP POLICY IF EXISTS "items_compra_super_admin_all" ON items_compra;
CREATE POLICY "items_compra_super_admin_all" ON items_compra
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM perfiles p
    WHERE p.id = auth.uid()
      AND p.rol_perfil = 'super_admin'
      AND p.activo = true
  )
);

DROP POLICY IF EXISTS "items_compra_member_select" ON items_compra;
CREATE POLICY "items_compra_member_select" ON items_compra
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM compras c
    JOIN miembros m ON m.productor_id = c.productor_id
    WHERE c.id = items_compra.compra_id
      AND m.perfil_id = auth.uid()
      AND m.activo = true
  )
);

DROP POLICY IF EXISTS "items_compra_admin_write" ON items_compra;
CREATE POLICY "items_compra_admin_write" ON items_compra
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM compras c
    JOIN miembros m ON m.productor_id = c.productor_id
    WHERE c.id = items_compra.compra_id
      AND m.perfil_id = auth.uid()
      AND m.rol = 'admin_productor'
      AND m.activo = true
  )
);

-- Función siguiente número de compra (interna)
CREATE OR REPLACE FUNCTION siguiente_numero_compra(p_productor_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_max INTEGER;
BEGIN
  SELECT COALESCE(MAX((numero_factura)::TEXT)::INTEGER, 0) + 1
  INTO v_max
  FROM compras
  WHERE productor_id = p_productor_id
    AND numero_factura ~ '^[0-9]+$';
  RETURN COALESCE(v_max, 1);
END;
$$ LANGUAGE plpgsql;

-- Trigger updated_at compras
DROP TRIGGER IF EXISTS trg_compras_updated_at ON compras;
CREATE TRIGGER trg_compras_updated_at
BEFORE UPDATE ON compras
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
