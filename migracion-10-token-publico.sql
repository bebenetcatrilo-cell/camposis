-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 10: Token público para presupuestos
-- ═══════════════════════════════════════════════════════════
-- Permite compartir presupuesto por link sin login
-- Ej: camposis.bbnetsystem.com/p/abc123xyz789
-- ═══════════════════════════════════════════════════════════

ALTER TABLE presupuestos
ADD COLUMN IF NOT EXISTS token_publico TEXT UNIQUE;

-- Generar tokens para presupuestos existentes
UPDATE presupuestos
SET token_publico = encode(gen_random_bytes(12), 'base64')
WHERE token_publico IS NULL;

-- Para nuevos presupuestos, el token se genera desde la app
-- Permitir SELECT público SOLO si tiene token (sin login)
DROP POLICY IF EXISTS "presupuestos_select_public" ON presupuestos;
CREATE POLICY "presupuestos_select_public" ON presupuestos FOR SELECT
TO anon
USING (token_publico IS NOT NULL);

-- Lo mismo para items
DROP POLICY IF EXISTS "items_presupuesto_select_public" ON items_presupuesto;
CREATE POLICY "items_presupuesto_select_public" ON items_presupuesto FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.id = presupuesto_id
      AND p.token_publico IS NOT NULL
  )
);

-- Permitir lectura pública de productores (solo datos básicos para mostrar logo, nombre)
DROP POLICY IF EXISTS "productores_select_public_presupuesto" ON productores;
CREATE POLICY "productores_select_public_presupuesto" ON productores FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.productor_id = productores.id
      AND p.token_publico IS NOT NULL
  )
);

-- Index para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_presupuestos_token_publico
ON presupuestos(token_publico)
WHERE token_publico IS NOT NULL;
