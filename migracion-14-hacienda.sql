-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 14: Hacienda (BLOQUE 1)
-- Categorías + Rodeos + Animales + Movimientos
-- ═══════════════════════════════════════════════════════════

-- ── ENUMS ──
DO $$ BEGIN
  CREATE TYPE tipo_mov_hacienda AS ENUM (
    'compra',
    'venta',
    'paricion',         -- nacimiento
    'muerte',           -- mortandad
    'consumo',          -- faena propia / consumo
    'traslado',         -- entre rodeos
    'recategorizacion'  -- ternero → vaquillona, etc.
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sexo_animal AS ENUM ('macho', 'hembra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 1) CATEGORÍAS DE HACIENDA ──
-- Catálogo del productor (vacas, vaquillonas, terneros, novillos, toros...)
CREATE TABLE IF NOT EXISTS categorias_hacienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,             -- "Vacas", "Vaquillonas", "Terneros machos", etc.
  sexo sexo_animal,                  -- para reportes
  orden INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#888888',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (productor_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_cat_hac_productor ON categorias_hacienda(productor_id);

-- ── 2) RODEOS (opcional) ──
CREATE TABLE IF NOT EXISTS rodeos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,             -- "Rodeo cría", "Lote 5", "Invernada"
  descripcion TEXT,
  ubicacion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (productor_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_rodeos_productor ON rodeos(productor_id);

-- ── 3) STOCK DE HACIENDA POR CATEGORÍA (y rodeo opcional) ──
-- Esta tabla guarda el stock actual por categoría + (opcional) rodeo
-- Se actualiza automáticamente con los movimientos
CREATE TABLE IF NOT EXISTS stock_hacienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_hacienda(id) ON DELETE CASCADE,
  rodeo_id UUID REFERENCES rodeos(id) ON DELETE SET NULL,  -- null = sin rodeo / total
  cantidad INTEGER NOT NULL DEFAULT 0,
  peso_total_kg NUMERIC(15, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (productor_id, categoria_id, rodeo_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_hac_productor ON stock_hacienda(productor_id);
CREATE INDEX IF NOT EXISTS idx_stock_hac_cat ON stock_hacienda(categoria_id);

-- ── 4) ANIMALES INDIVIDUALES (opcional, con caravana) ──
CREATE TABLE IF NOT EXISTS animales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  caravana TEXT NOT NULL,           -- número de caravana
  categoria_id UUID REFERENCES categorias_hacienda(id) ON DELETE SET NULL,
  rodeo_id UUID REFERENCES rodeos(id) ON DELETE SET NULL,
  sexo sexo_animal,
  fecha_nacimiento DATE,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg NUMERIC(10, 2),
  observaciones TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_baja DATE,
  motivo_baja TEXT,                 -- "venta", "muerte", "consumo"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (productor_id, caravana)
);

CREATE INDEX IF NOT EXISTS idx_animales_productor ON animales(productor_id);
CREATE INDEX IF NOT EXISTS idx_animales_caravana ON animales(productor_id, caravana);
CREATE INDEX IF NOT EXISTS idx_animales_activos ON animales(productor_id, activo);

-- ── 5) MOVIMIENTOS DE HACIENDA ──
CREATE TABLE IF NOT EXISTS movimientos_hacienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,

  -- Tipo y fecha
  tipo tipo_mov_hacienda NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Categorías (origen y destino - destino solo en recategorización)
  categoria_id UUID NOT NULL REFERENCES categorias_hacienda(id) ON DELETE RESTRICT,
  categoria_destino_id UUID REFERENCES categorias_hacienda(id) ON DELETE RESTRICT,

  -- Rodeos (origen y destino - destino solo en traslado)
  rodeo_id UUID REFERENCES rodeos(id) ON DELETE SET NULL,
  rodeo_destino_id UUID REFERENCES rodeos(id) ON DELETE SET NULL,

  -- Cantidades
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  peso_promedio_kg NUMERIC(10, 2),
  peso_total_kg NUMERIC(15, 2),

  -- Datos económicos (solo compra y venta)
  precio_por_kg NUMERIC(15, 2),
  precio_por_cabeza NUMERIC(15, 2),
  importe_total NUMERIC(15, 2),

  -- Contraparte
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,  -- compras
  proveedor_nombre TEXT,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,       -- ventas
  cliente_nombre TEXT,

  -- Vinculación a factura (opcional - solo en ventas)
  factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,

  -- Animales individuales involucrados (opcional)
  animales_ids UUID[],  -- array de IDs si afecta animales con caravana

  -- Causa específica (muerte/baja)
  motivo TEXT,  -- "rayo", "enfermedad", "robo", "faena casa", etc.

  observaciones TEXT,
  registrado_por UUID REFERENCES perfiles(id),

  -- Anulación
  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  anulado_en TIMESTAMPTZ,
  anulado_por UUID REFERENCES perfiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_hac_productor ON movimientos_hacienda(productor_id);
CREATE INDEX IF NOT EXISTS idx_mov_hac_fecha ON movimientos_hacienda(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mov_hac_tipo ON movimientos_hacienda(productor_id, tipo);
CREATE INDEX IF NOT EXISTS idx_mov_hac_categoria ON movimientos_hacienda(categoria_id);

-- ── RLS ──
ALTER TABLE categorias_hacienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE rodeos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_hacienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE animales ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_hacienda ENABLE ROW LEVEL SECURITY;

-- Aplico las MISMAS políticas a las 5 tablas (super_admin / member_select / admin_write)
-- categorias_hacienda
DROP POLICY IF EXISTS "cat_hac_super_admin_all" ON categorias_hacienda;
CREATE POLICY "cat_hac_super_admin_all" ON categorias_hacienda FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "cat_hac_member_select" ON categorias_hacienda;
CREATE POLICY "cat_hac_member_select" ON categorias_hacienda FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = categorias_hacienda.productor_id AND m.perfil_id = auth.uid() AND m.activo = true));

DROP POLICY IF EXISTS "cat_hac_admin_write" ON categorias_hacienda;
CREATE POLICY "cat_hac_admin_write" ON categorias_hacienda FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = categorias_hacienda.productor_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true));

-- rodeos
DROP POLICY IF EXISTS "rodeos_super_admin_all" ON rodeos;
CREATE POLICY "rodeos_super_admin_all" ON rodeos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "rodeos_member_select" ON rodeos;
CREATE POLICY "rodeos_member_select" ON rodeos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = rodeos.productor_id AND m.perfil_id = auth.uid() AND m.activo = true));

DROP POLICY IF EXISTS "rodeos_admin_write" ON rodeos;
CREATE POLICY "rodeos_admin_write" ON rodeos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = rodeos.productor_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true));

-- stock_hacienda
DROP POLICY IF EXISTS "stock_hac_super_admin_all" ON stock_hacienda;
CREATE POLICY "stock_hac_super_admin_all" ON stock_hacienda FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "stock_hac_member_select" ON stock_hacienda;
CREATE POLICY "stock_hac_member_select" ON stock_hacienda FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = stock_hacienda.productor_id AND m.perfil_id = auth.uid() AND m.activo = true));

DROP POLICY IF EXISTS "stock_hac_admin_write" ON stock_hacienda;
CREATE POLICY "stock_hac_admin_write" ON stock_hacienda FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = stock_hacienda.productor_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true));

-- animales
DROP POLICY IF EXISTS "animales_super_admin_all" ON animales;
CREATE POLICY "animales_super_admin_all" ON animales FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "animales_member_select" ON animales;
CREATE POLICY "animales_member_select" ON animales FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = animales.productor_id AND m.perfil_id = auth.uid() AND m.activo = true));

DROP POLICY IF EXISTS "animales_admin_write" ON animales;
CREATE POLICY "animales_admin_write" ON animales FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = animales.productor_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true));

-- movimientos_hacienda
DROP POLICY IF EXISTS "mov_hac_super_admin_all" ON movimientos_hacienda;
CREATE POLICY "mov_hac_super_admin_all" ON movimientos_hacienda FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol_perfil = 'super_admin' AND p.activo = true));

DROP POLICY IF EXISTS "mov_hac_member_select" ON movimientos_hacienda;
CREATE POLICY "mov_hac_member_select" ON movimientos_hacienda FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = movimientos_hacienda.productor_id AND m.perfil_id = auth.uid() AND m.activo = true));

DROP POLICY IF EXISTS "mov_hac_admin_write" ON movimientos_hacienda;
CREATE POLICY "mov_hac_admin_write" ON movimientos_hacienda FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM miembros m WHERE m.productor_id = movimientos_hacienda.productor_id AND m.perfil_id = auth.uid() AND m.rol = 'admin_productor' AND m.activo = true));

-- ── TRIGGERS updated_at ──
DROP TRIGGER IF EXISTS trg_cat_hac_updated_at ON categorias_hacienda;
CREATE TRIGGER trg_cat_hac_updated_at BEFORE UPDATE ON categorias_hacienda
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rodeos_updated_at ON rodeos;
CREATE TRIGGER trg_rodeos_updated_at BEFORE UPDATE ON rodeos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_animales_updated_at ON animales;
CREATE TRIGGER trg_animales_updated_at BEFORE UPDATE ON animales
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mov_hac_updated_at ON movimientos_hacienda;
CREATE TRIGGER trg_mov_hac_updated_at BEFORE UPDATE ON movimientos_hacienda
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── SEED: Categorías base ──
-- Insertamos las categorías típicas para cualquier productor nuevo
INSERT INTO categorias_hacienda (productor_id, nombre, sexo, orden, color)
SELECT id, 'Toros', 'macho', 1, '#1e40af' FROM productores
ON CONFLICT DO NOTHING;

INSERT INTO categorias_hacienda (productor_id, nombre, sexo, orden, color)
SELECT id, 'Vacas', 'hembra', 2, '#be185d' FROM productores
ON CONFLICT DO NOTHING;

INSERT INTO categorias_hacienda (productor_id, nombre, sexo, orden, color)
SELECT id, 'Vaquillonas', 'hembra', 3, '#db2777' FROM productores
ON CONFLICT DO NOTHING;

INSERT INTO categorias_hacienda (productor_id, nombre, sexo, orden, color)
SELECT id, 'Novillos', 'macho', 4, '#1e40af' FROM productores
ON CONFLICT DO NOTHING;

INSERT INTO categorias_hacienda (productor_id, nombre, sexo, orden, color)
SELECT id, 'Novillitos', 'macho', 5, '#3b82f6' FROM productores
ON CONFLICT DO NOTHING;

INSERT INTO categorias_hacienda (productor_id, nombre, sexo, orden, color)
SELECT id, 'Terneros', 'macho', 6, '#10b981' FROM productores
ON CONFLICT DO NOTHING;

INSERT INTO categorias_hacienda (productor_id, nombre, sexo, orden, color)
SELECT id, 'Terneras', 'hembra', 7, '#f59e0b' FROM productores
ON CONFLICT DO NOTHING;
