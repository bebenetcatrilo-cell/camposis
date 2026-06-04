-- ════════════════════════════════════════════════════════════
-- CAMPOS SIS · BLOQUE 03: STORAGE PARA LOGOS
-- Pegar en Supabase > SQL Editor > New query > Run
-- ════════════════════════════════════════════════════════════
-- Este SQL crea:
--   1. Un bucket "logos-productores" público (para los logos)
--   2. Policies que permiten que cada productor suba/edite su logo
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) CREAR BUCKET
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-productores', 'logos-productores', true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2) POLICIES DEL BUCKET
-- ─────────────────────────────────────────────────────────────

-- Lectura pública: cualquiera puede ver los logos (los clientes los van a mostrar)
DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos-productores');

-- Insertar: solo super_admin o admin del productor pueden subir
DROP POLICY IF EXISTS "logos_insert" ON storage.objects;
CREATE POLICY "logos_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos-productores'
  AND (
    es_super_admin()
    OR es_admin_productor()
  )
);

-- Actualizar: solo super_admin o admin del productor pueden modificar
DROP POLICY IF EXISTS "logos_update" ON storage.objects;
CREATE POLICY "logos_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos-productores'
  AND (
    es_super_admin()
    OR es_admin_productor()
  )
);

-- Eliminar: solo super_admin o admin del productor pueden borrar
DROP POLICY IF EXISTS "logos_delete" ON storage.objects;
CREATE POLICY "logos_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos-productores'
  AND (
    es_super_admin()
    OR es_admin_productor()
  )
);

-- ─────────────────────────────────────────────────────────────
-- 3) VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
  id, name, public, created_at
FROM storage.buckets
WHERE id = 'logos-productores';

-- Resultado esperado:
-- id: logos-productores
-- name: logos-productores
-- public: true
