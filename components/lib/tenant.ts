import { createClient } from './supabase/server';
import type { Productor } from './types';
import { headers } from 'next/headers';

/**
 * Extrae el slug del productor desde el hostname.
 * Ejemplos:
 *   donluis.camposis.bbnetsystem.com  → "donluis"
 *   camposis.bbnetsystem.com          → null
 *   localhost:3000                    → null
 */
export function extraerSlugDeHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0];
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const partes = hostname.split('.');
  if (partes.length >= 3) {
    const slug = partes[0];
    if (['app', 'www', 'admin', 'api', 'camposis'].includes(slug)) return null;
    return slug;
  }
  return null;
}

/**
 * Obtiene el productor según el subdominio de la request.
 * Usar en páginas/server components que dependan del tenant.
 */
export async function getProductorActual(): Promise<Productor | null> {
  const headersList = await headers();
  const host = headersList.get('host');
  const slug = extraerSlugDeHost(host);

  if (!slug) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('productores')
    .select('*')
    .eq('slug', slug)
    .eq('activa', true)
    .single();

  if (error || !data) return null;
  return data as Productor;
}

/**
 * Obtiene el productor del usuario logueado.
 * Útil cuando no usamos subdominio (ej. en /super-admin).
 */
export async function getProductorDelUsuario(): Promise<Productor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('productor_id, rol')
    .eq('id', user.id)
    .single();

  if (!perfil || !perfil.productor_id) return null;

  const { data: productor } = await supabase
    .from('productores')
    .select('*')
    .eq('id', perfil.productor_id)
    .single();

  return (productor as Productor) ?? null;
}
