'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const COOKIE_PRODUCTOR_ACTIVO = 'campossis_productor_activo';

/**
 * Setea la cookie del productor activo.
 */
async function setearCookie(productorId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_PRODUCTOR_ACTIVO, productorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

/**
 * Limpia la cookie.
 */
export async function limpiarCookieProductorAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_PRODUCTOR_ACTIVO);
}

/**
 * Selecciona productor activo y redirige a /admin.
 */
export async function cambiarProductorAction(productorId: string) {
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

  await setearCookie(productorId);
  revalidatePath('/', 'layout');
  redirect('/admin');
}

export async function seleccionarProductorAction(productorId: string) {
  return cambiarProductorAction(productorId);
}

export async function volverAlSelectorAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_PRODUCTOR_ACTIVO);
  redirect('/auth/seleccionar-productor');
}
