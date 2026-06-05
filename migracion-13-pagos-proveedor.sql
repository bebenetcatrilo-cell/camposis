-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 13: Pagos a Proveedores
-- ═══════════════════════════════════════════════════════════

-- Enum forma de pago (pagos a proveedor)
DO $$ BEGIN
  CREATE TYPE forma_pago_prov AS ENUM (
    'efectivo',
    'transferencia',
    'cheque_propio',       -- cheque emitido nuevo
    'cheque_endoso',       -- endosar un cheque recibido
    'tarjeta',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla: pago a proveedor (cabecera)
CREATE TABLE IF NOT EXISTS pagos_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,

  numero INTEGER NOT NULL,        -- nº interno secuencial por productor
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  proveedor_nombre TEXT NOT NULL, -- snapshot
  importe_total NUMERIC(15, 2) NOT NULL CHECK (importe_total > 0),

  forma_pago forma_pago_prov NOT NULL DEFAULT 'efectivo',

  -- Si forma_pago = cheque_propio → se crea un cheque emitido nuevo
  cheque_emitido_id UUID REFERENCES cheques_emitidos(id) ON DELETE SET NULL,
  -- Si forma_pago = cheque_endoso → se endosa un cheque recibido
  cheque_recibido_id UUID REFERENCES cheques_recibidos(id) ON DELETE SET NULL,

  notas TEXT,
  registrado_por UUID REFERENCES perfiles(id),

  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  anulado_en TIMESTAMPTZ,
  anulado_por UUID REFERENCES perfiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (productor_id, numero)
);

-- Tabla: imputaciones del pago a compras específicas
CREATE TABLE IF NOT EXISTS pago_proveedor_imputaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id UUID NOT NULL REFERENCES pagos_proveedor(id) ON DELETE CASCADE,
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE RESTRICT,
  importe NUMERIC(15, 2) NOT NULL CHECK (importe > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagos_prov_productor ON pagos_proveedor(productor_id);
CREATE INDEX IF NOT EXISTS idx_pagos_prov_proveedor ON pagos_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pagos_prov_fecha ON pagos_proveedor(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_imp_pago_prov_pago ON pago_proveedor_imputaciones(pago_id);
CREATE INDEX IF NOT EXISTS idx_imp_pago_prov_compra ON pago_proveedor_imputaciones(compra_id);

-- RLS
ALTER TABLE pagos_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_proveedor_imputaciones ENABLE ROW LEVEL SECURITY;

-- pagos_proveedor: super admin
DROP POLICY IF EXISTS "pagos_prov_super_admin_all" ON pagos_proveedor;
CREATE POLICY "pagos_prov_super_admin_all" ON pagos_proveedor FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

-- pagos_proveedor: miembros ven
DROP POLICY IF EXISTS "pagos_prov_member_select" ON pagos_proveedor;
CREATE POLICY "pagos_prov_member_select" ON pagos_proveedor FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = pagos_proveedor.productor_id AND m.perfil_id = auth.uid() AND m.activo = true));

-- pagos_proveedor: admins escriben
DROP POLICY IF EXISTS "pagos_prov_admin_write" ON pagos_proveedor;
CREATE POLICY "pagos_prov_admin_write" ON pagos_proveedor FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = pagos_proveedor.productor_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true));

-- Imputaciones: heredan via pago
DROP POLICY IF EXISTS "imp_pago_prov_super_admin_all" ON pago_proveedor_imputaciones;
CREATE POLICY "imp_pago_prov_super_admin_all" ON pago_proveedor_imputaciones FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "imp_pago_prov_member_select" ON pago_proveedor_imputaciones;
CREATE POLICY "imp_pago_prov_member_select" ON pago_proveedor_imputaciones FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM pagos_proveedor p JOIN miembros m ON m.productor_id = p.productor_id
  WHERE p.id = pago_proveedor_imputaciones.pago_id AND m.perfil_id = auth.uid() AND m.activo = true
));

DROP POLICY IF EXISTS "imp_pago_prov_admin_write" ON pago_proveedor_imputaciones;
CREATE POLICY "imp_pago_prov_admin_write" ON pago_proveedor_imputaciones FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM pagos_proveedor p JOIN miembros m ON m.productor_id = p.productor_id
  WHERE p.id = pago_proveedor_imputaciones.pago_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true
));

-- Función siguiente número
CREATE OR REPLACE FUNCTION siguiente_numero_pago_proveedor(p_productor_id UUID)
RETURNS INTEGER AS $$
DECLARE v_max INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_max FROM pagos_proveedor WHERE productor_id = p_productor_id;
  RETURN COALESCE(v_max, 1);
END;
$$ LANGUAGE plpgsql;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_pagos_prov_updated_at ON pagos_proveedor;
CREATE TRIGGER trg_pagos_prov_updated_at BEFORE UPDATE ON pagos_proveedor
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
