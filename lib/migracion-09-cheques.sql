-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 10: CHEQUES
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE estado_cheque_recibido AS ENUM (
    'cartera',      -- recibido, en mi poder
    'depositado',   -- deposité en banco, esperando acreditación
    'acreditado',   -- el banco lo acreditó
    'rechazado',    -- rebotó
    'endosado',     -- lo endosé a otro
    'vendido',      -- venta al banco con comisión
    'anulado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_cheque_emitido AS ENUM (
    'emitido',      -- firmado, todavía no entregué
    'entregado',    -- se lo entregué al beneficiario
    'cobrado',      -- el beneficiario lo cobró
    'anulado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) TABLA cheques_recibidos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cheques_recibidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  -- Datos del cheque
  numero TEXT NOT NULL,
  banco_emisor TEXT NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_cobro DATE NOT NULL,     -- vencimiento / cuándo se puede cobrar
  importe NUMERIC(15, 2) NOT NULL CHECK (importe > 0),
  a_nombre_de TEXT,              -- a quién está hecho (mi nombre / razón social)

  -- Vínculos opcionales
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,

  -- Estado
  estado estado_cheque_recibido NOT NULL DEFAULT 'cartera',

  -- ── Datos venta al banco (solo si estado='vendido') ──
  banco_venta TEXT,              -- banco que compró el cheque
  fecha_venta DATE,
  monto_recibido NUMERIC(15, 2), -- lo que efectivamente me dieron
  comision_venta NUMERIC(15, 2), -- importe - monto_recibido (calculado al guardar)

  -- ── Datos depósito (solo si estado='depositado'/'acreditado') ──
  banco_deposito TEXT,
  fecha_deposito DATE,

  -- ── Datos endoso (solo si estado='endosado') ──
  endosado_a TEXT,
  fecha_endoso DATE,

  -- ── Datos rechazo (solo si estado='rechazado') ──
  fecha_rechazo DATE,
  motivo_rechazo TEXT,

  notas TEXT,
  registrado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chr_productor ON cheques_recibidos(productor_id);
CREATE INDEX IF NOT EXISTS idx_chr_estado ON cheques_recibidos(estado);
CREATE INDEX IF NOT EXISTS idx_chr_fecha_cobro ON cheques_recibidos(fecha_cobro);
CREATE INDEX IF NOT EXISTS idx_chr_cliente ON cheques_recibidos(cliente_id);

DROP TRIGGER IF EXISTS set_updated_at_chr ON cheques_recibidos;
CREATE TRIGGER set_updated_at_chr
  BEFORE UPDATE ON cheques_recibidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3) TABLA cheques_emitidos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cheques_emitidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  numero TEXT NOT NULL,
  banco_propio TEXT NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_pago DATE NOT NULL,         -- cuándo se puede cobrar
  importe NUMERIC(15, 2) NOT NULL CHECK (importe > 0),
  beneficiario TEXT NOT NULL,       -- a quién va
  concepto TEXT,                    -- qué estoy pagando

  estado estado_cheque_emitido NOT NULL DEFAULT 'emitido',

  -- ── Datos entrega (si estado>='entregado') ──
  fecha_entrega DATE,

  -- ── Datos cobro (si estado='cobrado') ──
  fecha_cobro DATE,

  notas TEXT,
  registrado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_che_productor ON cheques_emitidos(productor_id);
CREATE INDEX IF NOT EXISTS idx_che_estado ON cheques_emitidos(estado);
CREATE INDEX IF NOT EXISTS idx_che_fecha_pago ON cheques_emitidos(fecha_pago);

DROP TRIGGER IF EXISTS set_updated_at_che ON cheques_emitidos;
CREATE TRIGGER set_updated_at_che
  BEFORE UPDATE ON cheques_emitidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4) RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE cheques_recibidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chr_select" ON cheques_recibidos;
CREATE POLICY "chr_select" ON cheques_recibidos FOR SELECT
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "chr_insert" ON cheques_recibidos;
CREATE POLICY "chr_insert" ON cheques_recibidos FOR INSERT
WITH CHECK (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "chr_update" ON cheques_recibidos;
CREATE POLICY "chr_update" ON cheques_recibidos FOR UPDATE
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "chr_delete" ON cheques_recibidos;
CREATE POLICY "chr_delete" ON cheques_recibidos FOR DELETE
USING (es_super_admin() OR es_admin_del_productor(productor_id));

ALTER TABLE cheques_emitidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "che_select" ON cheques_emitidos;
CREATE POLICY "che_select" ON cheques_emitidos FOR SELECT
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "che_insert" ON cheques_emitidos;
CREATE POLICY "che_insert" ON cheques_emitidos FOR INSERT
WITH CHECK (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "che_update" ON cheques_emitidos;
CREATE POLICY "che_update" ON cheques_emitidos FOR UPDATE
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "che_delete" ON cheques_emitidos;
CREATE POLICY "che_delete" ON cheques_emitidos FOR DELETE
USING (es_super_admin() OR es_admin_del_productor(productor_id));

-- ─────────────────────────────────────────────────────────────
-- 5) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  'cheques_recibidos' AS tabla, COUNT(*) AS filas FROM cheques_recibidos
UNION ALL SELECT 'cheques_emitidos', COUNT(*) FROM cheques_emitidos;
