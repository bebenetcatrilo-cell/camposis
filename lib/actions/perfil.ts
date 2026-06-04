'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ──────────────────────────────────────────────────────────────
// EDITAR MI PERFIL (nombre, teléfono)
// ──────────────────────────────────────────────────────────────
export async function editarMiPerfilAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const nombre = String(formData.get('nombre') || '').trim();
  const telefono = String(formData.get('telefono') || '').trim() || null;

  if (!nombre) return { error: 'El nombre es obligatorio' };

  const { error } = await supabase
    .from('perfiles')
    .update({ nombre, telefono })
    .eq('id', user.id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/perfil');
  revalidatePath('/admin');
  return { ok: true, message: 'Perfil actualizado' };
}

// ──────────────────────────────────────────────────────────────
// CAMBIAR MI CONTRASEÑA
// ──────────────────────────────────────────────────────────────
export async function cambiarPasswordAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const password_actual = String(formData.get('password_actual') || '');
  const password_nuevo = String(formData.get('password_nuevo') || '');
  const password_confirmar = String(formData.get('password_confirmar') || '');

  if (!password_actual || !password_nuevo || !password_confirmar) {
    return { error: 'Completá todos los campos' };
  }

  if (password_nuevo.length < 8) {
    return { error: 'La nueva contraseña debe tener al menos 8 caracteres' };
  }

  if (password_nuevo !== password_confirmar) {
    return { error: 'Las contraseñas nuevas no coinciden' };
  }

  // Verificar contraseña actual intentando reautenticar
  const { error: errVerify } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: password_actual,
  });
  if (errVerify) {
    return { error: 'La contraseña actual es incorrecta' };
  }

  // Cambiar
  const { error } = await supabase.auth.updateUser({ password: password_nuevo });
  if (error) return { error: 'Error al cambiar: ' + error.message };

  return { ok: true, message: 'Contraseña actualizada' };
}
