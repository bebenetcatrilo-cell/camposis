-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 15: Cobros de Facturas (espejo de pagos a proveedor)
-- ═══════════════════════════════════════════════════════════

-- 1) Agregar columna monto_cobrado a facturas
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS monto_cobrado NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- Inicializar: las cobradas tenían el total cobrado
UPDATE facturas
SET monto_cobrado = total
WHERE estado = 'cobrada' AND monto_cobrado = 0;

-- 2) Nuevo estado 'parcial' en facturas (cobrada parcialmente)
DO $$ BEGIN
  ALTER TYPE estado_factura ADD VALUE IF NOT EXISTS 'parcial';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3) Forma de cobro
DO $$ BEGIN
  CREATE TYPE forma_cobro AS ENUM (
    'efectivo',
    'transferencia',
    'cheque_recibido',     -- recibe un cheque nuevo (entra a cartera)
    'tarjeta',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Tabla cobros (cabecera)
CREATE TABLE IF NOT EXISTS cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,

  numero INTEGER NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_nombre TEXT NOT NULL,
  importe_total NUMERIC(15, 2) NOT NULL CHECK (importe_total > 0),

  forma_cobro forma_cobro NOT NULL DEFAULT 'efectivo',

  -- Si forma_cobro = cheque_recibido → se crea cheque nuevo en cartera
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

-- 5) Imputaciones: qué facturas saldó este cobro
CREATE TABLE IF NOT EXISTS cobro_imputaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobro_id UUID NOT NULL REFERENCES cobros(id) ON DELETE CASCADE,
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
  importe NUMERIC(15, 2) NOT NULL CHECK (importe > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cobros_productor ON cobros(productor_id);
CREATE INDEX IF NOT EXISTS idx_cobros_cliente ON cobros(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha ON cobros(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_imp_cobro_cobro ON cobro_imputaciones(cobro_id);
CREATE INDEX IF NOT EXISTS idx_imp_cobro_factura ON cobro_imputaciones(factura_id);

-- RLS cobros
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobro_imputaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cobros_super_admin_all" ON cobros;
CREATE POLICY "cobros_super_admin_all" ON cobros FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "cobros_member_select" ON cobros;
CREATE POLICY "cobros_member_select" ON cobros FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = cobros.productor_id AND m.perfil_id = auth.uid() AND m.activo = true));

DROP POLICY IF EXISTS "cobros_admin_write" ON cobros;
CREATE POLICY "cobros_admin_write" ON cobros FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = cobros.productor_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true));

DROP POLICY IF EXISTS "imp_cobro_super_admin_all" ON cobro_imputaciones;
CREATE POLICY "imp_cobro_super_admin_all" ON cobro_imputaciones FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "imp_cobro_member_select" ON cobro_imputaciones;
CREATE POLICY "imp_cobro_member_select" ON cobro_imputaciones FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM cobros c JOIN miembros m ON m.productor_id = c.productor_id
  WHERE c.id = cobro_imputaciones.cobro_id AND m.perfil_id = auth.uid() AND m.activo = true
));

DROP POLICY IF EXISTS "imp_cobro_admin_write" ON cobro_imputaciones;
CREATE POLICY "imp_cobro_admin_write" ON cobro_imputaciones FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM cobros c JOIN miembros m ON m.productor_id = c.productor_id
  WHERE c.id = cobro_imputaciones.cobro_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true
));

-- Función siguiente número
CREATE OR REPLACE FUNCTION siguiente_numero_cobro(p_productor_id UUID)
RETURNS INTEGER AS $$
DECLARE v_max INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_max FROM cobros WHERE productor_id = p_productor_id;
  RETURN COALESCE(v_max, 1);
END;
$$ LANGUAGE plpgsql;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_cobros_updated_at ON cobros;
CREATE TRIGGER trg_cobros_updated_at BEFORE UPDATE ON cobros
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
