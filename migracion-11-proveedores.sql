-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 11: Proveedores (BLOQUE 1 - ABM básico)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  -- Identificación
  nombre TEXT NOT NULL,
  cuit TEXT,
  condicion_iva condicion_iva NOT NULL DEFAULT 'ri',

  -- Categorización (texto libre)
  rubro TEXT,

  -- Contacto
  email TEXT,
  telefono TEXT,
  whatsapp TEXT,
  contacto_nombre TEXT,           -- Nombre de la persona de contacto

  -- Dirección
  direccion TEXT,
  localidad TEXT,
  provincia TEXT,
  cp TEXT,

  -- Comercial
  plazo_pago_dias INTEGER DEFAULT 0,  -- 0 = contado, 30 = a 30 días, etc.
  cbu TEXT,                            -- Para transferencias
  alias_cbu TEXT,                      -- Alias bancario
  saldo_cta_cte NUMERIC(15, 2) NOT NULL DEFAULT 0,
  -- POSITIVO: vos le debés al proveedor
  -- NEGATIVO: el proveedor te debe (saldo a favor)

  notas_internas TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No dos proveedores con el mismo CUIT por productor
  UNIQUE NULLS NOT DISTINCT (productor_id, cuit)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_proveedores_productor ON proveedores(productor_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(productor_id, nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(productor_id, activo);
CREATE INDEX IF NOT EXISTS idx_proveedores_rubro ON proveedores(productor_id, rubro);

-- RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Política: super admins ven todo
DROP POLICY IF EXISTS "proveedores_super_admin_all" ON proveedores;
CREATE POLICY "proveedores_super_admin_all" ON proveedores
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM perfiles p
    WHERE p.id = auth.uid()
      AND p.rol_perfil = 'super_admin'
      AND p.activo = true
  )
);

-- Política: usuarios ven los proveedores de los productores donde tienen membresía
DROP POLICY IF EXISTS "proveedores_member_select" ON proveedores;
CREATE POLICY "proveedores_member_select" ON proveedores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM miembros m
    WHERE m.productor_id = proveedores.productor_id
      AND m.perfil_id = auth.uid()
      AND m.activo = true
  )
);

-- Política: admins pueden crear/editar/eliminar
DROP POLICY IF EXISTS "proveedores_admin_write" ON proveedores;
CREATE POLICY "proveedores_admin_write" ON proveedores
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM miembros m
    WHERE m.productor_id = proveedores.productor_id
      AND m.perfil_id = auth.uid()
      AND m.rol = 'admin_productor'
      AND m.activo = true
  )
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_proveedores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON proveedores;
CREATE TRIGGER trg_proveedores_updated_at
BEFORE UPDATE ON proveedores
FOR EACH ROW EXECUTE FUNCTION set_proveedores_updated_at();
