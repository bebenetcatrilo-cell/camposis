'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Productor, MembresiaConProductor } from '@/lib/types';

const COOKIE_PRODUCTOR_ACTIVO = 'campossis_productor_activo';

/**
 * Devuelve todas las membresías del usuario actual (activas).
 */
export async function getMisMembresia(): Promise<MembresiaConProductor[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('miembros')
    .select(`
      id,
      perfil_id,
      productor_id,
      rol,
      activo,
      agregado_por,
      created_at,
      updated_at,
      productor:productores!miembros_productor_id_fkey (
        id,
        nombre,
        slug,
        nombre_campo,
        logo_url,
        color_primario,
        plan,
        estado_suscripcion
      )
    `)
    .eq('perfil_id', user.id)
    .eq('activo', true)
    .order('created_at');

  if (error || !data) return [];

  // Normalizar (Supabase puede devolver el join como array u objeto)
  return data.map((m: any) => ({
    ...m,
    productor: Array.isArray(m.productor) ? m.productor[0] : m.productor,
  })) as MembresiaConProductor[];
}

/**
 * Devuelve el productor activo basado en la cookie.
 * Si no hay cookie o el productor en cookie no es válido,
 * devuelve null (hay que mandar al selector).
 */
export async function getProductorActivo(): Promise<{
  productor: Productor;
  rol: 'admin_productor' | 'empleado';
} | null> {
  const cookieStore = await cookies();
  const productorActivoId = cookieStore.get(COOKIE_PRODUCTOR_ACTIVO)?.value;
  if (!productorActivoId) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verificar que el usuario sea miembro activo de ese productor
  const { data: membresia } = await supabase
    .from('miembros')
    .select('rol, activo, productor:productores(*)')
    .eq('perfil_id', user.id)
    .eq('productor_id', productorActivoId)
    .eq('activo', true)
    .single();

  if (!membresia || !membresia.productor) return null;

  const productor = Array.isArray(membresia.productor)
    ? membresia.productor[0]
    : membresia.productor;

  return {
    productor: productor as Productor,
    rol: membresia.rol as 'admin_productor' | 'empleado',
  };
}

/**
 * Setea el productor activo en una cookie.
 */
export async function setProductorActivo(productorId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_PRODUCTOR_ACTIVO, productorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: '/',
  });
}

/**
 * Limpia la cookie del productor activo.
 */
export async function clearProductorActivo() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_PRODUCTOR_ACTIVO);
}
