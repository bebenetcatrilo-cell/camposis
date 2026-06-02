import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service_role_key.
 *
 * ⚠️ NUNCA usar desde el cliente (browser). Solo desde Server Actions
 * o Route Handlers. Este cliente BYPASSEA RLS.
 *
 * Se usa para operaciones admin como:
 *   - Crear usuarios sin desloguear al super-admin
 *   - Operaciones que requieren saltarse RLS
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
