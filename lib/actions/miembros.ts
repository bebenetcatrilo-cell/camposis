'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

async function asegurarSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol_perfil, activo')
    .eq('id', user.id)
    .single();
  if (!perfil || perfil.rol_perfil !== 'super_admin' || !perfil.activo) {
    throw new Error('Sin permisos');
  }
  return user;
}

export async function agregarMiembroAction(formData: FormData) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const productor_id = String(formData.get('productor_id') || '');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const nombre = String(formData.get('nombre') || '').trim();
  const password = String(formData.get('password') || '');
  const rol = String(formData.get('rol') || 'empleado') as 'admin_productor' | 'empleado';
  const crear_si_no_existe = formData.get('crear_si_no_existe') === 'true';

  if (!productor_id) return { error: 'Falta productor' };
  if (!email) return { error: 'Falta el email' };
  if (rol !== 'admin_productor' && rol !== 'empleado') {
    return { error: 'Rol inválido' };
  }

  const admin = createAdminClient();

  let perfilId: string | null = null;
  const { data: perfilExistente } = await admin
    .from('perfiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (perfilExistente) {
    perfilId = perfilExistente.id;
  } else {
    if (!crear_si_no_existe) {
      return {
        error: `No existe un usuario con email "${email}". Tildá la opción "Crear si no existe" para crearlo automáticamente.`,
      };
    }
    if (!nombre) return { error: 'Falta el nombre del usuario nuevo' };
    if (!password || password.length < 8) {
      return { error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    // Crear usuario CON la contraseña que ingresó el super-admin
    const { data: userData, error: errUser } = await admin.auth.admin.createUser({
      email,
      password,  // ← AHORA SE PASA LA CONTRASEÑA
      email_confirm: true,
      user_metadata: { nombre },
    });

    if (errUser) {
      return { error: `Error al crear usuario: ${errUser.message}` };
    }
    perfilId = userData.user!.id;
  }

  const { data: yaEsMiembro } = await admin
    .from('miembros')
    .select('id, activo')
    .eq('perfil_id', perfilId)
    .eq('productor_id', productor_id)
    .maybeSingle();

  if (yaEsMiembro) {
    if (yaEsMiembro.activo) {
      return { error: 'Este usuario ya es miembro de este productor' };
    }
    const { error } = await admin
      .from('miembros')
      .update({ activo: true, rol })
      .eq('id', yaEsMiembro.id);
    if (error) return { error: 'Error: ' + error.message };
  } else {
    const { error } = await admin
      .from('miembros')
      .insert({
        perfil_id: perfilId,
        productor_id,
        rol,
        activo: true,
      });
    if (error) return { error: 'Error: ' + error.message };
  }

  revalidatePath(`/super-admin/productores/${productor_id}`);
  revalidatePath(`/super-admin/productores/${productor_id}/usuarios`);
  return { ok: true };
}

export async function cambiarRolMiembroAction(
  miembroId: string,
  nuevoRol: 'admin_productor' | 'empleado'
) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('miembros')
    .update({ rol: nuevoRol })
    .eq('id', miembroId);

  if (error) return { error: 'Error: ' + error.message };
  return { ok: true };
}

export async function quitarMiembroAction(miembroId: string, productorId: string) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('miembros')
    .update({ activo: false })
    .eq('id', miembroId);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath(`/super-admin/productores/${productorId}/usuarios`);
  return { ok: true };
}

export async function reactivarMiembroAction(miembroId: string, productorId: string) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('miembros')
    .update({ activo: true })
    .eq('id', miembroId);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath(`/super-admin/productores/${productorId}/usuarios`);
  return { ok: true };
}
