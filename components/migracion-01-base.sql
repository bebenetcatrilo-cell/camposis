-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 01: SCHEMA BASE
-- Pegar en Supabase > SQL Editor > New query > Run
-- ════════════════════════════════════════════════════════════
-- Este SQL crea:
--   1. Tabla productores (los tenants del SaaS)
--   2. Tabla perfiles (los usuarios, vinculados a auth.users)
--   3. Tabla suscripciones (historial de pagos)
--   4. Helpers de seguridad (mi_productor_id, es_super_admin, etc)
--   5. Trigger para crear perfil automáticamente al registrarse
--   6. RLS básico para las 3 tablas
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE rol_usuario_tipo AS ENUM (
    'super_admin',      -- Bebe: ve todos los productores
    'admin_productor',  -- Dueño del campo
    'empleado'          -- Operario, contador, etc.
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_tipo AS ENUM ('trial', 'basico', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_suscripcion_tipo AS ENUM (
    'activa',
    'vencida',
    'suspendida',
    'cancelada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) TABLA: productores (tenants)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,           -- ej: "donluis" → donluis.camposis.bbnetsystem.com
  email_contacto TEXT NOT NULL,
  telefono TEXT,
  whatsapp TEXT,

  -- Datos del establecimiento
  nombre_campo TEXT,                   -- "Estancia Don Luis"
  direccion TEXT,
  localidad TEXT,
  provincia TEXT,
  cuit TEXT,

  -- Branding
  logo_url TEXT,
  color_primario TEXT NOT NULL DEFAULT '#4a7c2a',
  dominio_custom TEXT,                 -- ej: campos.donluis.com (futuro)

  -- Suscripción
  plan plan_tipo NOT NULL DEFAULT 'trial',
  estado_suscripcion estado_suscripcion_tipo NOT NULL DEFAULT 'activa',
  trial_termina DATE,
  proximo_pago DATE,

  -- Límites del plan
  limite_usuarios INTEGER NOT NULL DEFAULT 3,
  limite_silos INTEGER NOT NULL DEFAULT 10,

  -- Estado
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  notas_internas TEXT,                 -- comentarios del super-admin (Bebe)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productores_slug ON productores(slug);
CREATE INDEX IF NOT EXISTS idx_productores_activa ON productores(activa);

-- ─────────────────────────────────────────────────────────────
-- 3) TABLA: perfiles (los usuarios del sistema)
-- ─────────────────────────────────────────────────────────────
-- perfiles.id = auth.users.id (1 a 1 con Supabase Auth)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  productor_id UUID REFERENCES productores(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  rol rol_usuario_tipo NOT NULL DEFAULT 'empleado',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perfiles_productor ON perfiles(productor_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON perfiles(rol);

-- ─────────────────────────────────────────────────────────────
-- 4) TABLA: suscripciones (historial de pagos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id UUID NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto NUMERIC(12,2) NOT NULL,
  plan plan_tipo NOT NULL,
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  metodo_pago TEXT,                    -- "Transferencia", "Efectivo", "Mercado Pago"
  comprobante_url TEXT,                -- foto/PDF del comprobante
  notas TEXT,
  registrado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_productor ON suscripciones(productor_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_fecha ON suscripciones(fecha DESC);

-- ─────────────────────────────────────────────────────────────
-- 5) FUNCIONES HELPER (para usar en RLS)
-- ─────────────────────────────────────────────────────────────

-- Devuelve el productor_id del usuario actual
CREATE OR REPLACE FUNCTION mi_productor_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT productor_id FROM perfiles WHERE id = auth.uid();
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
    WHERE id = auth.uid() AND rol = 'super_admin' AND activo = TRUE
  );
$$;

-- ¿El usuario actual es admin del productor?
CREATE OR REPLACE FUNCTION es_admin_productor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid() AND rol = 'admin_productor' AND activo = TRUE
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 6) TRIGGER: cuando se crea un user en auth.users, crear perfil
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO perfiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    -- Si viene en metadata, usar ese rol. Si no, empleado por default.
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario_tipo, 'empleado')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 7) TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_productores ON productores;
CREATE TRIGGER set_updated_at_productores
  BEFORE UPDATE ON productores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_perfiles ON perfiles;
CREATE TRIGGER set_updated_at_perfiles
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 8) ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE productores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;

-- ───────── productores ─────────
DROP POLICY IF EXISTS "productores_select" ON productores;
CREATE POLICY "productores_select" ON productores FOR SELECT
USING (
  es_super_admin()                       -- super-admin ve todos
  OR id = mi_productor_id()              -- usuario ve solo el suyo
);

DROP POLICY IF EXISTS "productores_insert_super" ON productores;
CREATE POLICY "productores_insert_super" ON productores FOR INSERT
WITH CHECK (es_super_admin());           -- solo super-admin crea

DROP POLICY IF EXISTS "productores_update" ON productores;
CREATE POLICY "productores_update" ON productores FOR UPDATE
USING (
  es_super_admin()
  OR (es_admin_productor() AND id = mi_productor_id())
);

DROP POLICY IF EXISTS "productores_delete_super" ON productores;
CREATE POLICY "productores_delete_super" ON productores FOR DELETE
USING (es_super_admin());

-- ───────── perfiles ─────────
DROP POLICY IF EXISTS "perfiles_select" ON perfiles;
CREATE POLICY "perfiles_select" ON perfiles FOR SELECT
USING (
  es_super_admin()                       -- super-admin ve todos
  OR id = auth.uid()                     -- usuario ve su propio perfil
  OR productor_id = mi_productor_id()    -- admin ve perfiles de su productor
);

DROP POLICY IF EXISTS "perfiles_insert_super" ON perfiles;
CREATE POLICY "perfiles_insert_super" ON perfiles FOR INSERT
WITH CHECK (
  es_super_admin()
  OR id = auth.uid()                     -- al registrarse, uno crea su perfil
);

DROP POLICY IF EXISTS "perfiles_update" ON perfiles;
CREATE POLICY "perfiles_update" ON perfiles FOR UPDATE
USING (
  es_super_admin()
  OR id = auth.uid()                     -- uno actualiza su perfil
  OR (es_admin_productor() AND productor_id = mi_productor_id())
);

-- ───────── suscripciones ─────────
DROP POLICY IF EXISTS "suscripciones_select" ON suscripciones;
CREATE POLICY "suscripciones_select" ON suscripciones FOR SELECT
USING (
  es_super_admin()
  OR productor_id = mi_productor_id()    -- productor ve sus propios pagos
);

DROP POLICY IF EXISTS "suscripciones_insert_super" ON suscripciones;
CREATE POLICY "suscripciones_insert_super" ON suscripciones FOR INSERT
WITH CHECK (es_super_admin());           -- solo super-admin registra pagos

DROP POLICY IF EXISTS "suscripciones_update_super" ON suscripciones;
CREATE POLICY "suscripciones_update_super" ON suscripciones FOR UPDATE
USING (es_super_admin());

-- ─────────────────────────────────────────────────────────────
-- 9) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  'productores'  AS tabla, COUNT(*) AS filas FROM productores
UNION ALL SELECT 'perfiles',     COUNT(*) FROM perfiles
UNION ALL SELECT 'suscripciones', COUNT(*) FROM suscripciones;

-- ════════════════════════════════════════════════════════════
-- DESPUÉS DE CORRER ESTO:
-- ════════════════════════════════════════════════════════════
-- 1) Andá a Supabase > Authentication > Users
-- 2) Click en "Add user" > "Create new user"
-- 3) Email: tu@email.com  ·  Password: la que quieras
-- 4) Click "Create user"
-- 5) Volvé al SQL Editor y corré esto para hacerte super-admin:
--
--    UPDATE perfiles
--    SET rol = 'super_admin', nombre = 'Bebe Álvarez'
--    WHERE email = 'tu@email.com';
--
-- 6) Listo. Ahora podés loguearte y ver el super-admin panel.
-- ════════════════════════════════════════════════════════════
