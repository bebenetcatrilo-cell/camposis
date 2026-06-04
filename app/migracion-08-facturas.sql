-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 09: FACTURAS
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tipo_factura AS ENUM (
    'A',         -- Factura A
    'B',         -- Factura B
    'C',         -- Factura C
    'X'          -- Recibo X (interno)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_factura AS ENUM (
    'borrador',  -- en preparación, no cuenta
    'emitida',   -- emitida pero no cobrada
    'cobrada',   -- cobrada (afecta saldo cliente)
    'anulada'    -- anulada (no cuenta)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) AGREGAR campos a productores para facturación
-- ─────────────────────────────────────────────────────────────
ALTER TABLE productores
  ADD COLUMN IF NOT EXISTS punto_venta TEXT NOT NULL DEFAULT '0001',
  ADD COLUMN IF NOT EXISTS condicion_iva_propia TEXT;
  -- condicion_iva_propia: 'ri' / 'monotributo' / 'exento'
  -- según condición fiscal del productor, define qué facturas puede emitir

-- ─────────────────────────────────────────────────────────────
-- 3) TABLA facturas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  -- Identificación fiscal
  tipo tipo_factura NOT NULL,
  punto_venta TEXT NOT NULL,
  numero INTEGER NOT NULL,              -- 1, 2, 3... (se muestra 00000001)
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,

  -- CAE (para ARCA - opcional, se carga manualmente)
  cae TEXT,
  cae_vencimiento DATE,

  -- Cliente (snapshot al momento de emitir)
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_cuit TEXT,
  cliente_condicion_iva TEXT,
  cliente_direccion TEXT,
  cliente_localidad TEXT,

  -- Origen (opcional, si viene de un presupuesto)
  presupuesto_id UUID REFERENCES presupuestos(id) ON DELETE SET NULL,

  -- Concepto / descripción general
  concepto TEXT,

  -- Totales
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 0,
  iva_monto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Estado y notas
  estado estado_factura NOT NULL DEFAULT 'borrador',
  notas TEXT,

  -- Cobro
  forma_pago TEXT,                       -- 'efectivo', 'transferencia', 'cheque', etc.
  fecha_cobro DATE,
  observaciones_cobro TEXT,

  -- Tracking
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Único por tipo + punto_venta + número POR productor
  UNIQUE (productor_id, tipo, punto_venta, numero)
);

CREATE INDEX IF NOT EXISTS idx_facturas_productor ON facturas(productor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON facturas(tipo);

DROP TRIGGER IF EXISTS set_updated_at_facturas ON facturas;
CREATE TRIGGER set_updated_at_facturas
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4) TABLA items_factura
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items_factura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,

  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  unidad TEXT,

  cantidad NUMERIC(15, 3) NOT NULL CHECK (cantidad >= 0),
  precio_unitario NUMERIC(15, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(15, 2) NOT NULL,

  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_fact_factura ON items_factura(factura_id);

-- ─────────────────────────────────────────────────────────────
-- 5) FUNCIÓN: siguiente número por tipo + punto_venta
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION siguiente_numero_factura(
  p_productor_id UUID,
  p_tipo tipo_factura,
  p_punto_venta TEXT
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(numero), 0) + 1
  FROM facturas
  WHERE productor_id = p_productor_id
    AND tipo = p_tipo
    AND punto_venta = p_punto_venta;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6) TRIGGER: impactar saldo del cliente cuando se cobra/descobra
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_factura_saldo_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_cobrada BOOLEAN := COALESCE(OLD.estado = 'cobrada', FALSE);
  v_new_cobrada BOOLEAN := COALESCE(NEW.estado = 'cobrada', FALSE);
BEGIN
  -- Solo se afecta saldo cuando cambia el estado entre 'cobrada' y otros
  -- O cuando cambia el total de una factura ya cobrada

  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Caso 1: Pasó a "cobrada" desde otro estado → suma al saldo (cliente debe menos)
  -- Pero ojo: nuestro modelo es que "saldo positivo = cliente nos debe"
  -- Si cobramos una factura, la deuda disminuye → restamos del saldo

  -- En realidad la lógica clásica es:
  -- Factura emitida → cliente debe (saldo +)
  -- Factura cobrada → cliente pagó (saldo no cambia, pero la factura ya está saldada)

  -- Pero como elegimos "solo afecta al cobrarla":
  -- Cuando se cobra → NO sumamos al saldo, porque significa que ya pagó
  -- En realidad: cuando NO está cobrada y el cliente debería pagarla, eso queda
  -- registrado en la factura misma

  -- Simplificación: este trigger NO toca el saldo automáticamente
  -- (el saldo se ve consultando facturas no cobradas)

  RETURN NEW;
END;
$$;

-- (No creamos el trigger porque la decisión fue "solo afectar al cobrar"
-- y como el cobro NO cambia el saldo del cliente que ya está,
-- lo dejamos sin trigger automático. El saldo lo manejamos como dato manual.)

-- ─────────────────────────────────────────────────────────────
-- 7) VISTA: facturas pendientes de cobro por cliente
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW facturas_pendientes_cliente AS
SELECT
  f.cliente_id,
  f.productor_id,
  c.nombre AS cliente_nombre,
  COUNT(*) AS cantidad_pendientes,
  SUM(f.total) AS total_pendiente
FROM facturas f
LEFT JOIN clientes c ON c.id = f.cliente_id
WHERE f.estado = 'emitida'
GROUP BY f.cliente_id, f.productor_id, c.nombre;

-- ─────────────────────────────────────────────────────────────
-- 8) RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_select" ON facturas;
CREATE POLICY "facturas_select" ON facturas FOR SELECT
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "facturas_insert" ON facturas;
CREATE POLICY "facturas_insert" ON facturas FOR INSERT
WITH CHECK (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "facturas_update" ON facturas;
CREATE POLICY "facturas_update" ON facturas FOR UPDATE
USING (es_super_admin() OR es_miembro_del_productor(productor_id));

DROP POLICY IF EXISTS "facturas_delete" ON facturas;
CREATE POLICY "facturas_delete" ON facturas FOR DELETE
USING (es_super_admin() OR es_admin_del_productor(productor_id));

ALTER TABLE items_factura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_fact_select" ON items_factura;
CREATE POLICY "items_fact_select" ON items_factura FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM facturas f
    WHERE f.id = items_factura.factura_id
      AND (es_super_admin() OR es_miembro_del_productor(f.productor_id))
  )
);

DROP POLICY IF EXISTS "items_fact_insert" ON items_factura;
CREATE POLICY "items_fact_insert" ON items_factura FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM facturas f
    WHERE f.id = items_factura.factura_id
      AND (es_super_admin() OR es_miembro_del_productor(f.productor_id))
  )
);

DROP POLICY IF EXISTS "items_fact_update" ON items_factura;
CREATE POLICY "items_fact_update" ON items_factura FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM facturas f
    WHERE f.id = items_factura.factura_id
      AND (es_super_admin() OR es_miembro_del_productor(f.productor_id))
  )
);

DROP POLICY IF EXISTS "items_fact_delete" ON items_factura;
CREATE POLICY "items_fact_delete" ON items_factura FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM facturas f
    WHERE f.id = items_factura.factura_id
      AND (es_super_admin() OR es_miembro_del_productor(f.productor_id))
  )
);

-- ─────────────────────────────────────────────────────────────
-- 9) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  'facturas' AS tabla, COUNT(*) AS filas FROM facturas
UNION ALL SELECT 'items_factura', COUNT(*) FROM items_factura
UNION ALL SELECT 'productores con punto_venta', COUNT(*) FROM productores WHERE punto_venta IS NOT NULL;
