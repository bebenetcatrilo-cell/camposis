-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 06: CLIENTES
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tipo_cliente AS ENUM (
    'acopio',          -- compra cereal
    'frigorifico',     -- compra hacienda
    'proveedor',       -- te vende (semilla, agroquímicos, etc.)
    'particular',      -- productor / persona común
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE condicion_iva AS ENUM (
    'ri',                  -- Responsable Inscripto
    'monotributo',
    'exento',
    'consumidor_final',
    'no_categorizado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) TABLA clientes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  -- Identificación
  nombre TEXT NOT NULL,
  tipo tipo_cliente NOT NULL DEFAULT 'particular',
  cuit TEXT,
  condicion_iva condicion_iva NOT NULL DEFAULT 'consumidor_final',

  -- Contacto
  email TEXT,
  telefono TEXT,
  whatsapp TEXT,

  -- Dirección
  direccion TEXT,
  localidad TEXT,
  provincia TEXT,
  cp TEXT,

  -- Comercial
  saldo_cta_cte NUMERIC(15, 2) NOT NULL DEFAULT 0,
  -- POSITIVO: el cliente te debe
  -- NEGATIVO: vos le debés al cliente

  notas_internas TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No dos clientes con el mismo CUIT por productor (si el CUIT está cargado)
  UNIQUE NULLS NOT DISTINCT (productor_id, cuit)
);

CREATE INDEX IF NOT EXISTS idx_clientes_productor ON clientes(productor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_lower ON clientes(productor_id, LOWER(nombre));

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_clientes ON clientes;
CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3) RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_select" ON clientes;
CREATE POLICY "clientes_select" ON clientes FOR SELECT
USING (
  es_super_admin()
  OR es_miembro_del_productor(productor_id)
);

DROP POLICY IF EXISTS "clientes_insert" ON clientes;
CREATE POLICY "clientes_insert" ON clientes FOR INSERT
WITH CHECK (
  es_super_admin()
  OR es_miembro_del_productor(productor_id)
);

DROP POLICY IF EXISTS "clientes_update" ON clientes;
CREATE POLICY "clientes_update" ON clientes FOR UPDATE
USING (
  es_super_admin()
  OR es_miembro_del_productor(productor_id)
);

DROP POLICY IF EXISTS "clientes_delete" ON clientes;
CREATE POLICY "clientes_delete" ON clientes FOR DELETE
USING (
  es_super_admin()
  OR es_admin_del_productor(productor_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  'tabla clientes' AS objeto,
  COUNT(*) AS filas
FROM clientes;

-- Esperado: 0 filas (lista vacía, cada productor va a cargar las suyas)
