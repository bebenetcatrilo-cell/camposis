import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Productor, MembresiaConProductor } from '@/lib/types';

const COOKIE_PRODUCTOR_ACTIVO = 'campossis_productor_activo';

/**
 * Devuelve todas las membresías del usuario actual (activas).
 * Helper de lectura, no es server action.
 */
export async function getMisMembresia(): Promise<MembresiaConProductor[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: miembros, error } = await supabase
    .from('miembros')
    .select('id, perfil_id, productor_id, rol, activo, agregado_por, created_at, updated_at')
    .eq('perfil_id', user.id)
    .eq('activo', true)
    .order('created_at');

  if (error || !miembros || miembros.length === 0) {
    return [];
  }

  const productorIds = miembros.map((m) => m.productor_id);
  const { data: productores, error: errProd } = await supabase
    .from('productores')
    .select('id, nombre, slug, nombre_campo, logo_url, color_primario, plan, estado_suscripcion')
    .in('id', productorIds);

  if (errProd || !productores) {
    return [];
  }

  const productoresMap = new Map(productores.map((p) => [p.id, p]));
  const resultado: MembresiaConProductor[] = miembros
    .map((m) => {
      const productor = productoresMap.get(m.productor_id);
      if (!productor) return null;
      return {
        ...m,
        rol: m.rol as 'admin_productor' | 'empleado',
        productor,
      };
    })
    .filter((x): x is MembresiaConProductor => x !== null);

  return resultado;
}

/**
 * Devuelve el productor activo basado en la cookie.
 * Helper de lectura, no es server action.
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

  const { data: membresia } = await supabase
    .from('miembros')
    .select('rol, activo')
    .eq('perfil_id', user.id)
    .eq('productor_id', productorActivoId)
    .eq('activo', true)
    .single();

  if (!membresia) return null;

  const { data: productor } = await supabase
    .from('productores')
    .select('*')
    .eq('id', productorActivoId)
    .single();

  if (!productor) return null;

  return {
    productor: productor as Productor,
    rol: membresia.rol as 'admin_productor' | 'empleado',
  };
}

export const COOKIE_NAME_PRODUCTOR_ACTIVO = COOKIE_PRODUCTOR_ACTIVO;
