'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setProductorActivo, clearProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';

/**
 * Selecciona un productor activo y redirige al /admin.
 */
export async function seleccionarProductorAction(productorId: string) {
  if (!productorId) return { error: 'Falta el productor' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Verificar que el usuario sea miembro activo
  const { data: membresia } = await supabase
    .from('miembros')
    .select('id')
    .eq('perfil_id', user.id)
    .eq('productor_id', productorId)
    .eq('activo', true)
    .single();

  if (!membresia) {
    return { error: 'No tenés acceso a este productor' };
  }

  await setProductorActivo(productorId);
  revalidatePath('/', 'layout');
  redirect('/admin');
}

/**
 * Cambia el productor activo (desde el switcher en la sidebar).
 */
export async function cambiarProductorAction(productorId: string) {
  return seleccionarProductorAction(productorId);
}

/**
 * Vuelve al selector de productor.
 */
export async function volverAlSelectorAction() {
  await clearProductorActivo();
  redirect('/auth/seleccionar-productor');
}
