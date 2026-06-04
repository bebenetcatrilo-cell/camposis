-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 04: MULTI-MEMBERSHIP
-- Migración: un usuario puede pertenecer a MÚLTIPLES productores
-- ════════════════════════════════════════════════════════════
--
-- ⚠️ IMPORTANTE: Este SQL hace cambios estructurales.
--    Corré línea por línea verificando cada paso.
--    Si algo falla, parate y mandame el error.
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) CREAR TABLA miembros (relación N:N)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS miembros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  rol rol_usuario_tipo NOT NULL DEFAULT 'empleado'
    CHECK (rol IN ('admin_productor', 'empleado')),  -- super_admin NO va en miembros
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  agregado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un usuario solo puede estar 1 vez por productor
  UNIQUE(perfil_id, productor_id)
);

CREATE INDEX IF NOT EXISTS idx_miembros_perfil ON miembros(perfil_id);
CREATE INDEX IF NOT EXISTS idx_miembros_productor ON miembros(productor_id);
CREATE INDEX IF NOT EXISTS idx_miembros_activo ON miembros(activo);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_miembros ON miembros;
CREATE TRIGGER set_updated_at_miembros
  BEFORE UPDATE ON miembros
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2) MIGRAR DATOS EXISTENTES
-- ─────────────────────────────────────────────────────────────
-- Tomamos los perfiles con productor_id y rol no super_admin
-- y los pasamos a la nueva tabla miembros
INSERT INTO miembros (perfil_id, productor_id, rol, activo, created_at)
SELECT
  id AS perfil_id,
  productor_id,
  rol,
  activo,
  created_at
FROM perfiles
WHERE productor_id IS NOT NULL
  AND rol IN ('admin_productor', 'empleado')
ON CONFLICT (perfil_id, productor_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 3) ACTUALIZAR LA TABLA perfiles
-- ─────────────────────────────────────────────────────────────
-- Mantener la columna rol pero solo se va a usar para super_admin
-- Quitar la columna productor_id porque ya está en miembros
-- (la dejamos pero la "deprecamos" - los nuevos códigos no la usan)

-- Actualizar el rol: ahora rol en perfiles solo distingue super_admin
-- de "usuario_normal" (cuyo rol real está en miembros)
DO $$ BEGIN
  CREATE TYPE rol_perfil_tipo AS ENUM (
    'super_admin',
    'usuario_normal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Agregar columna rol_perfil (nueva)
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS rol_perfil rol_perfil_tipo DEFAULT 'usuario_normal';

-- Migrar: si el viejo rol era super_admin → super_admin, sino usuario_normal
UPDATE perfiles
SET rol_perfil = CASE
  WHEN rol = 'super_admin' THEN 'super_admin'::rol_perfil_tipo
  ELSE 'usuario_normal'::rol_perfil_tipo
END
WHERE rol_perfil IS NULL OR rol_perfil = 'usuario_normal';

-- La columna `rol` la dejamos por compatibilidad pero no se usa más
-- (los códigos nuevos usan rol_perfil en perfiles + rol en miembros)


-- ─────────────────────────────────────────────────────────────
-- 4) FUNCIONES HELPER ACTUALIZADAS
-- ─────────────────────────────────────────────────────────────

-- Reemplazo: mi_productor_id() ahora devuelve el productor ACTIVO del usuario
-- Si tiene varios, devuelve NULL (hay que usar el productor_id en cookie)
-- Esta función solo se usa cuando NO se especifica productor por cookie/header.
CREATE OR REPLACE FUNCTION mi_productor_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT productor_id
  FROM miembros
  WHERE perfil_id = auth.uid()
    AND activo = TRUE
  LIMIT 1;  -- Si tiene varios, devuelve el primero (no es ideal pero por compat)
$$;

-- ¿El usuario actual es super_admin?
CREATE OR REPLACE FUNCTION es_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
      AND rol_perfil = 'super_admin'
      AND activo = TRUE
  );
$$;

-- ¿El usuario actual es admin de ALGUN productor?
CREATE OR REPLACE FUNCTION es_admin_productor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM miembros
    WHERE perfil_id = auth.uid()
      AND rol = 'admin_productor'
      AND activo = TRUE
  );
$$;

-- ¿El usuario actual es admin de un productor específico?
CREATE OR REPLACE FUNCTION es_admin_del_productor(productor_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM miembros
    WHERE perfil_id = auth.uid()
      AND productor_id = productor_uuid
      AND rol = 'admin_productor'
      AND activo = TRUE
  );
$$;

-- ¿El usuario actual es miembro (cualquier rol) de un productor específico?
CREATE OR REPLACE FUNCTION es_miembro_del_productor(productor_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM miembros
    WHERE perfil_id = auth.uid()
      AND productor_id = productor_uuid
      AND activo = TRUE
  );
$$;


-- ─────────────────────────────────────────────────────────────
-- 5) ACTUALIZAR TRIGGER handle_new_user
-- ─────────────────────────────────────────────────────────────
-- Cuando se crea un usuario, ya no se le asigna productor automáticamente
-- (se le asigna después en la creación del productor o desde el panel)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO perfiles (id, email, nombre, rol, rol_perfil)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    'empleado',  -- el rol viejo (compat)
    'usuario_normal'  -- el rol nuevo
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 6) RLS para tabla miembros
-- ─────────────────────────────────────────────────────────────
ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "miembros_select" ON miembros;
CREATE POLICY "miembros_select" ON miembros FOR SELECT
USING (
  es_super_admin()
  OR perfil_id = auth.uid()  -- usuario ve sus propias membresías
  OR es_admin_del_productor(productor_id)  -- admin del prod ve los miembros del prod
);

DROP POLICY IF EXISTS "miembros_insert" ON miembros;
CREATE POLICY "miembros_insert" ON miembros FOR INSERT
WITH CHECK (
  es_super_admin()
  OR es_admin_del_productor(productor_id)
);

DROP POLICY IF EXISTS "miembros_update" ON miembros;
CREATE POLICY "miembros_update" ON miembros FOR UPDATE
USING (
  es_super_admin()
  OR es_admin_del_productor(productor_id)
);

DROP POLICY IF EXISTS "miembros_delete" ON miembros;
CREATE POLICY "miembros_delete" ON miembros FOR DELETE
USING (
  es_super_admin()
  OR es_admin_del_productor(productor_id)
);


-- ─────────────────────────────────────────────────────────────
-- 7) ACTUALIZAR RLS de las tablas existentes
-- ─────────────────────────────────────────────────────────────
-- Las policies de productores siguen iguales (mi_productor_id sigue funcionando
-- en modo "primer productor" para retrocompatibilidad), pero ahora hay que
-- agregar policies adicionales que consideren multi-membership

-- productores: el usuario ve los productores donde es miembro
DROP POLICY IF EXISTS "productores_select" ON productores;
CREATE POLICY "productores_select" ON productores FOR SELECT
USING (
  es_super_admin()
  OR es_miembro_del_productor(id)  -- nuevo: cualquier miembro ve su productor
);

DROP POLICY IF EXISTS "productores_update" ON productores;
CREATE POLICY "productores_update" ON productores FOR UPDATE
USING (
  es_super_admin()
  OR es_admin_del_productor(id)  -- nuevo: solo admin del productor
);

-- perfiles: actualizar para considerar multi-membership
DROP POLICY IF EXISTS "perfiles_select" ON perfiles;
CREATE POLICY "perfiles_select" ON perfiles FOR SELECT
USING (
  es_super_admin()
  OR id = auth.uid()
  OR EXISTS (
    -- admin de algún productor ve a los miembros de SUS productores
    SELECT 1 FROM miembros m1
    JOIN miembros m2 ON m1.productor_id = m2.productor_id
    WHERE m1.perfil_id = auth.uid()
      AND m1.rol = 'admin_productor'
      AND m1.activo = TRUE
      AND m2.perfil_id = perfiles.id
  )
);


-- ─────────────────────────────────────────────────────────────
-- 8) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  'miembros'  AS tabla, COUNT(*) AS filas FROM miembros
UNION ALL SELECT 'productores',    COUNT(*) FROM productores
UNION ALL SELECT 'perfiles',       COUNT(*) FROM perfiles
UNION ALL SELECT 'super_admins',   COUNT(*) FROM perfiles WHERE rol_perfil = 'super_admin';

-- ════════════════════════════════════════════════════════════
-- DESPUÉS DE CORRER ESTO:
--   - La tabla miembros tiene los datos migrados
--   - Tu super-admin sigue siendo super-admin
--   - El sistema soporta multi-membership pero todavía
--     funciona como antes (cada usuario tiene 1 productor)
--
--   - Para asignar un usuario a MULTIPLES productores:
--     INSERT INTO miembros (perfil_id, productor_id, rol)
--     VALUES ('perfil-uuid', 'productor-uuid', 'admin_productor');
-- ════════════════════════════════════════════════════════════
