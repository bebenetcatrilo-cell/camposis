'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

/**
 * Iniciar sesión con email + password.
 * Devuelve { error } o redirige al panel.
 */
export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const redirectTo = String(formData.get('redirectTo') || '');

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email o contraseña incorrectos' };
    }
    return { error: error.message };
  }

  // Determinar dónde mandarlo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No se pudo iniciar sesión' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, activo')
    .eq('id', user.id)
    .single();

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    return { error: 'Tu cuenta está desactivada. Contactá al administrador.' };
  }

  // Marcar último login (best-effort)
  await supabase
    .from('perfiles')
    .update({ ultimo_login: new Date().toISOString() })
    .eq('id', user.id);

  // Redirect según rol
  if (redirectTo && redirectTo.startsWith('/')) {
    redirect(redirectTo);
  }
  if (perfil.rol === 'super_admin') redirect('/super-admin');
  redirect('/admin');
}

/**
 * Cerrar sesión.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}

/**
 * Registro inicial (autoregistro de productor + admin del productor).
 * Esto es lo que hace el cliente nuevo al darse de alta solo.
 * (Por ahora simple. Más adelante agregamos confirmación de email.)
 */
export async function registroAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const nombre = String(formData.get('nombre') || '').trim();

  if (!email || !password || !nombre) {
    return { error: 'Completá todos los campos' };
  }
  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        rol: 'empleado', // Por defecto. Bebe convierte a admin_productor manualmente.
      },
    },
  });

  if (error) return { error: error.message };

  return {
    success: true,
    message: 'Cuenta creada. Revisá tu email para confirmar.',
  };
}
