'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

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
    throw new Error('Solo super-admin puede realizar esta acción');
  }
  return user;
}

// ──────────────────────────────────────────────────────────────
// CREAR PRODUCTOR
// ──────────────────────────────────────────────────────────────

export async function crearProductorAction(formData: FormData) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const nombre = String(formData.get('nombre') || '').trim();
  let slug = String(formData.get('slug') || '').trim().toLowerCase();
  const email_contacto = String(formData.get('email_contacto') || '').trim();
  const telefono = String(formData.get('telefono') || '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') || '').trim() || null;
  const nombre_campo = String(formData.get('nombre_campo') || '').trim() || null;
  const direccion = String(formData.get('direccion') || '').trim() || null;
  const localidad = String(formData.get('localidad') || '').trim() || null;
  const provincia = String(formData.get('provincia') || '').trim() || null;
  const cuit = String(formData.get('cuit') || '').trim() || null;
  const plan = String(formData.get('plan') || 'trial');
  const trial_termina = String(formData.get('trial_termina') || '').trim() || null;
  const proximo_pago = String(formData.get('proximo_pago') || '').trim() || null;
  const notas_internas = String(formData.get('notas_internas') || '').trim() || null;

  const crear_usuario_admin = formData.get('crear_usuario_admin') === 'true';
  const admin_email = String(formData.get('admin_email') || '').trim();
  const admin_nombre = String(formData.get('admin_nombre') || '').trim();
  const usar_existente = formData.get('usar_existente') === 'true';

  // Validaciones
  if (!nombre) return { error: 'El nombre es obligatorio' };
  if (!email_contacto) return { error: 'El email de contacto es obligatorio' };

  if (!slug) slug = slugify(nombre);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'El slug solo puede tener letras, números y guiones' };
  }
  if (slug.length < 2 || slug.length > 40) {
    return { error: 'El slug debe tener entre 2 y 40 caracteres' };
  }
  if (['app', 'www', 'admin', 'api', 'camposis'].includes(slug)) {
    return { error: 'Ese slug está reservado, elegí otro' };
  }

  if (crear_usuario_admin) {
    if (!admin_email) return { error: 'Falta el email del admin del productor' };
    if (!usar_existente && !admin_nombre) {
      return { error: 'Falta el nombre del admin del productor' };
    }
  }

  const admin = createAdminClient();

  // Verificar slug
  const { data: existente } = await admin
    .from('productores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existente) {
    return { error: `Ya existe un productor con el slug "${slug}"` };
  }

  // Crear productor
  const { data: nuevo, error: errInsert } = await admin
    .from('productores')
    .insert({
      nombre,
      slug,
      email_contacto,
      telefono,
      whatsapp,
      nombre_campo,
      direccion,
      localidad,
      provincia,
      cuit,
      plan,
      estado_suscripcion: 'activa',
      trial_termina: trial_termina || null,
      proximo_pago: proximo_pago || null,
      notas_internas,
      activa: true,
    })
    .select()
    .single();

  if (errInsert) {
    return { error: 'Error al crear: ' + errInsert.message };
  }

  // Si se pidió, crear o asociar usuario admin
  if (crear_usuario_admin && nuevo) {
    let perfilId: string | null = null;

    if (usar_existente) {
      // Buscar perfil existente por email
      const { data: perfilExistente } = await admin
        .from('perfiles')
        .select('id, nombre')
        .eq('email', admin_email)
        .single();

      if (!perfilExistente) {
        return {
          error: `No existe un usuario con email "${admin_email}". Crealo primero o usá la opción de "Crear nuevo usuario".`,
          productorId: nuevo.id,
        };
      }
      perfilId = perfilExistente.id;
    } else {
      // Crear usuario nuevo
      const { data: userData, error: errUser } = await admin.auth.admin.createUser({
        email: admin_email,
        email_confirm: true,
        user_metadata: {
          nombre: admin_nombre,
        },
      });

      if (errUser) {
        // Si el error es porque el email ya existe, sugerir usar_existente
        if (errUser.message.toLowerCase().includes('already registered')
          || errUser.message.toLowerCase().includes('already exists')) {
          return {
            error: `Ya existe un usuario con email "${admin_email}". Marcá "usar usuario existente" para asociarlo a este productor.`,
            productorId: nuevo.id,
          };
        }
        return {
          error: `Productor creado pero falló crear el usuario admin: ${errUser.message}`,
          productorId: nuevo.id,
        };
      }
      perfilId = userData.user!.id;
    }

    // Crear membresía
    const { error: errMembresia } = await admin
      .from('miembros')
      .insert({
        perfil_id: perfilId,
        productor_id: nuevo.id,
        rol: 'admin_productor',
        activo: true,
      });

    if (errMembresia) {
      return {
        error: `Productor y usuario creados pero falló asociar membresía: ${errMembresia.message}`,
        productorId: nuevo.id,
      };
    }
  }

  revalidatePath('/super-admin/productores');
  revalidatePath('/super-admin');
  redirect(`/super-admin/productores/${nuevo.id}`);
}

// ──────────────────────────────────────────────────────────────
// EDITAR PRODUCTOR
// ──────────────────────────────────────────────────────────────

export async function editarProductorAction(formData: FormData) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID del productor' };

  const nombre = String(formData.get('nombre') || '').trim();
  const email_contacto = String(formData.get('email_contacto') || '').trim();
  const telefono = String(formData.get('telefono') || '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') || '').trim() || null;
  const nombre_campo = String(formData.get('nombre_campo') || '').trim() || null;
  const direccion = String(formData.get('direccion') || '').trim() || null;
  const localidad = String(formData.get('localidad') || '').trim() || null;
  const provincia = String(formData.get('provincia') || '').trim() || null;
  const cuit = String(formData.get('cuit') || '').trim() || null;
  const plan = String(formData.get('plan') || 'trial');
  const trial_termina = String(formData.get('trial_termina') || '').trim() || null;
  const proximo_pago = String(formData.get('proximo_pago') || '').trim() || null;
  const notas_internas = String(formData.get('notas_internas') || '').trim() || null;

  if (!nombre) return { error: 'El nombre es obligatorio' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('productores')
    .update({
      nombre,
      email_contacto,
      telefono,
      whatsapp,
      nombre_campo,
      direccion,
      localidad,
      provincia,
      cuit,
      plan,
      trial_termina: trial_termina || null,
      proximo_pago: proximo_pago || null,
      notas_internas,
    })
    .eq('id', id);

  if (error) return { error: 'Error al editar: ' + error.message };

  revalidatePath(`/super-admin/productores/${id}`);
  revalidatePath('/super-admin/productores');
  redirect(`/super-admin/productores/${id}`);
}

// ──────────────────────────────────────────────────────────────
// SUSPENDER / REACTIVAR
// ──────────────────────────────────────────────────────────────

export async function cambiarEstadoProductorAction(
  productorId: string,
  nuevoEstado: 'activa' | 'vencida' | 'suspendida' | 'cancelada'
) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('productores')
    .update({
      estado_suscripcion: nuevoEstado,
      activa: nuevoEstado === 'activa',
    })
    .eq('id', productorId);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath(`/super-admin/productores/${productorId}`);
  revalidatePath('/super-admin/productores');
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR
// ──────────────────────────────────────────────────────────────

export async function eliminarProductorAction(productorId: string) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('productores')
    .delete()
    .eq('id', productorId);

  if (error) return { error: 'Error al eliminar: ' + error.message };

  revalidatePath('/super-admin/productores');
  redirect('/super-admin/productores');
}

// ──────────────────────────────────────────────────────────────
// REGISTRAR PAGO
// ──────────────────────────────────────────────────────────────

export async function registrarPagoAction(formData: FormData) {
  try {
    await asegurarSuperAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const productor_id = String(formData.get('productor_id') || '');
  const monto = parseFloat(String(formData.get('monto') || '0'));
  const plan = String(formData.get('plan') || 'basico');
  const periodo_desde = String(formData.get('periodo_desde') || '');
  const periodo_hasta = String(formData.get('periodo_hasta') || '');
  const metodo_pago = String(formData.get('metodo_pago') || 'Transferencia');
  const notas = String(formData.get('notas') || '').trim() || null;

  if (!productor_id) return { error: 'Falta productor' };
  if (monto <= 0) return { error: 'El monto debe ser mayor a 0' };
  if (!periodo_desde || !periodo_hasta) return { error: 'Faltan las fechas del período' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin
    .from('suscripciones')
    .insert({
      productor_id,
      monto,
      plan,
      periodo_desde,
      periodo_hasta,
      metodo_pago,
      notas,
      registrado_por: user?.id ?? null,
    });

  if (error) return { error: 'Error al registrar pago: ' + error.message };

  await admin
    .from('productores')
    .update({
      estado_suscripcion: 'activa',
      activa: true,
      proximo_pago: periodo_hasta,
    })
    .eq('id', productor_id);

  revalidatePath(`/super-admin/productores/${productor_id}`);
  revalidatePath('/super-admin/productores');
  revalidatePath('/super-admin');
  return { ok: true };
}
