'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getProductorActivo } from '@/lib/productor-actual';

// ──────────────────────────────────────────────────────────────
// Helper: chequear que el usuario es admin del productor activo
// ──────────────────────────────────────────────────────────────
async function asegurarAdminDelProductorActivo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Obtener productor activo y rol en él
  const ctx = await getProductorActivo();
  if (!ctx) throw new Error('No hay productor activo');

  if (ctx.rol !== 'admin_productor') {
    throw new Error('Solo el administrador del productor puede modificar la configuración');
  }

  return { user, productor: ctx.productor };
}

// ──────────────────────────────────────────────────────────────
// EDITAR CONFIGURACIÓN DEL PRODUCTOR
// ──────────────────────────────────────────────────────────────
export async function editarConfiguracionAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarAdminDelProductorActivo();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

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

  if (!/^#[0-9a-fA-F]{6}$/.test(color_primario)) {
    return { error: 'El color debe tener formato #RRGGBB (ej: #4a7c2a)' };
  }

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
    .eq('id', ctx.productor.id);

  if (error) return { error: 'Error al guardar: ' + error.message };

  revalidatePath('/admin/configuracion');
  revalidatePath('/admin');
  return { ok: true, message: 'Configuración guardada' };
}

// ──────────────────────────────────────────────────────────────
// SUBIR LOGO
// ──────────────────────────────────────────────────────────────
export async function subirLogoAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarAdminDelProductorActivo();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const file = formData.get('logo') as File | null;
  if (!file || file.size === 0) {
    return { error: 'Seleccioná una imagen' };
  }

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!tiposPermitidos.includes(file.type)) {
    return { error: 'Tipo de imagen no soportado. Usá JPG, PNG, WebP o SVG.' };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: 'La imagen debe pesar menos de 2 MB' };
  }

  const admin = createAdminClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${ctx.productor.id}/logo.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: errUpload } = await admin.storage
    .from('logos-productores')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (errUpload) {
    return { error: 'Error al subir: ' + errUpload.message };
  }

  const { data: urlData } = admin.storage
    .from('logos-productores')
    .getPublicUrl(path);
  const logo_url = urlData.publicUrl;
  const cacheBuster = `?t=${Date.now()}`;

  const { error: errUpdate } = await admin
    .from('productores')
    .update({ logo_url: logo_url + cacheBuster })
    .eq('id', ctx.productor.id);

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
  let ctx;
  try {
    ctx = await asegurarAdminDelProductorActivo();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const admin = createAdminClient();

  const { data: files } = await admin.storage
    .from('logos-productores')
    .list(ctx.productor.id);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${ctx.productor.id}/${f.name}`);
    await admin.storage.from('logos-productores').remove(paths);
  }

  const { error } = await admin
    .from('productores')
    .update({ logo_url: null })
    .eq('id', ctx.productor.id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/configuracion');
  revalidatePath('/admin');
  return { ok: true };
}
