'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ──────────────────────────────────────────────────────────────
// Helper: chequear que el usuario es admin de su productor
// ──────────────────────────────────────────────────────────────
async function asegurarAdminProductor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, activo, productor_id')
    .eq('id', user.id)
    .single();

  if (!perfil || !perfil.activo) {
    throw new Error('Cuenta no activa');
  }
  if (perfil.rol !== 'admin_productor' && perfil.rol !== 'super_admin') {
    throw new Error('Solo el administrador del productor puede modificar la configuración');
  }
  if (!perfil.productor_id && perfil.rol !== 'super_admin') {
    throw new Error('Usuario sin productor asignado');
  }
  return { user, perfil };
}

// ──────────────────────────────────────────────────────────────
// EDITAR CONFIGURACIÓN DEL PRODUCTOR
// (el productor edita sus propios datos)
// ──────────────────────────────────────────────────────────────
export async function editarConfiguracionAction(formData: FormData) {
  let perfilCtx;
  try {
    perfilCtx = await asegurarAdminProductor();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const productor_id = perfilCtx.perfil.productor_id;
  if (!productor_id) return { error: 'Sin productor asignado' };

  const nombre = String(formData.get('nombre') || '').trim();
  const nombre_campo = String(formData.get('nombre_campo') || '').trim() || null;
  const email_contacto = String(formData.get('email_contacto') || '').trim();
  const telefono = String(formData.get('telefono') || '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') || '').trim() || null;
  const direccion = String(formData.get('direccion') || '').trim() || null;
  const localidad = String(formData.get('localidad') || '').trim() || null;
  const provincia = String(formData.get('provincia') || '').trim() || null;
  const cuit = String(formData.get('cuit') || '').trim() || null;
  const color_primario = String(formData.get('color_primario') || '#4a7c2a').trim();

  if (!nombre) return { error: 'El nombre es obligatorio' };
  if (!email_contacto) return { error: 'El email de contacto es obligatorio' };

  // Validar formato color
  if (!/^#[0-9a-fA-F]{6}$/.test(color_primario)) {
    return { error: 'El color debe tener formato #RRGGBB (ej: #4a7c2a)' };
  }

  // Usar admin client para evitar problemas con RLS (ya validamos permisos arriba)
  const admin = createAdminClient();
  const { error } = await admin
    .from('productores')
    .update({
      nombre,
      nombre_campo,
      email_contacto,
      telefono,
      whatsapp,
      direccion,
      localidad,
      provincia,
      cuit,
      color_primario,
    })
    .eq('id', productor_id);

  if (error) return { error: 'Error al guardar: ' + error.message };

  revalidatePath('/admin/configuracion');
  revalidatePath('/admin');
  return { ok: true, message: 'Configuración guardada' };
}

// ──────────────────────────────────────────────────────────────
// SUBIR LOGO
// ──────────────────────────────────────────────────────────────
export async function subirLogoAction(formData: FormData) {
  let perfilCtx;
  try {
    perfilCtx = await asegurarAdminProductor();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const productor_id = perfilCtx.perfil.productor_id;
  if (!productor_id) return { error: 'Sin productor asignado' };

  const file = formData.get('logo') as File | null;
  if (!file || file.size === 0) {
    return { error: 'Seleccioná una imagen' };
  }

  // Validar tipo
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!tiposPermitidos.includes(file.type)) {
    return { error: 'Tipo de imagen no soportado. Usá JPG, PNG, WebP o SVG.' };
  }

  // Validar tamaño (max 2 MB)
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'La imagen debe pesar menos de 2 MB' };
  }

  const admin = createAdminClient();

  // Nombre del archivo: <productor_id>/logo.<ext>
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${productor_id}/logo.${ext}`;

  // Subir
  const arrayBuffer = await file.arrayBuffer();
  const { error: errUpload } = await admin.storage
    .from('logos-productores')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true, // reemplazar si ya existe
    });

  if (errUpload) {
    return { error: 'Error al subir: ' + errUpload.message };
  }

  // Obtener URL pública
  const { data: urlData } = admin.storage
    .from('logos-productores')
    .getPublicUrl(path);
  const logo_url = urlData.publicUrl;

  // Guardar en la fila del productor
  // Agregamos ?t=timestamp para evitar caché del browser después de cambiar
  const cacheBuster = `?t=${Date.now()}`;
  const { error: errUpdate } = await admin
    .from('productores')
    .update({ logo_url: logo_url + cacheBuster })
    .eq('id', productor_id);

  if (errUpdate) {
    return { error: 'Logo subido pero falló guardar URL: ' + errUpdate.message };
  }

  revalidatePath('/admin/configuracion');
  revalidatePath('/admin');
  return { ok: true, logo_url: logo_url + cacheBuster };
}

// ──────────────────────────────────────────────────────────────
// QUITAR LOGO
// ──────────────────────────────────────────────────────────────
export async function quitarLogoAction() {
  let perfilCtx;
  try {
    perfilCtx = await asegurarAdminProductor();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const productor_id = perfilCtx.perfil.productor_id;
  if (!productor_id) return { error: 'Sin productor asignado' };

  const admin = createAdminClient();

  // Listar archivos del productor en el bucket
  const { data: files } = await admin.storage
    .from('logos-productores')
    .list(productor_id);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${productor_id}/${f.name}`);
    await admin.storage.from('logos-productores').remove(paths);
  }

  // Limpiar el campo en la base
  const { error } = await admin
    .from('productores')
    .update({ logo_url: null })
    .eq('id', productor_id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/configuracion');
  revalidatePath('/admin');
  return { ok: true };
}
