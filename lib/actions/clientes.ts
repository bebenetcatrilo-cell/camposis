'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function asegurarMiembro() {
  const ctx = await getProductorActivo();
  if (!ctx) throw new Error('Sin productor activo');
  return ctx;
}

function limpiarCuit(cuit: string): string | null {
  const limpio = cuit.replace(/[^\d]/g, '');
  return limpio.length === 11 ? limpio : (limpio.length > 0 ? limpio : null);
}

// ──────────────────────────────────────────────────────────────
// CREAR CLIENTE
// ──────────────────────────────────────────────────────────────
export async function crearClienteAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const nombre = String(formData.get('nombre') || '').trim();
  const tipo = String(formData.get('tipo') || 'particular');
  const cuitRaw = String(formData.get('cuit') || '').trim();
  const cuit = cuitRaw ? limpiarCuit(cuitRaw) : null;
  const condicion_iva = String(formData.get('condicion_iva') || 'consumidor_final');
  const email = String(formData.get('email') || '').trim() || null;
  const telefono = String(formData.get('telefono') || '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') || '').trim() || null;
  const direccion = String(formData.get('direccion') || '').trim() || null;
  const localidad = String(formData.get('localidad') || '').trim() || null;
  const provincia = String(formData.get('provincia') || '').trim() || null;
  const cp = String(formData.get('cp') || '').trim() || null;
  const saldo_str = String(formData.get('saldo_cta_cte') || '0').trim();
  const saldo_cta_cte = parseFloat(saldo_str) || 0;
  const notas_internas = String(formData.get('notas_internas') || '').trim() || null;

  if (!nombre) return { error: 'El nombre es obligatorio' };

  // Validar CUIT si está cargado (formato básico)
  if (cuitRaw && (!cuit || cuit.length !== 11)) {
    return { error: 'El CUIT debe tener 11 dígitos (sin guiones es OK, ej: 20123456789)' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      productor_id: ctx.productor.id,
      nombre,
      tipo,
      cuit,
      condicion_iva,
      email,
      telefono,
      whatsapp,
      direccion,
      localidad,
      provincia,
      cp,
      saldo_cta_cte,
      notas_internas,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: `Ya existe un cliente con CUIT ${cuit}` };
    }
    return { error: 'Error al crear: ' + error.message };
  }

  revalidatePath('/admin/clientes');
  redirect(`/admin/clientes/${data.id}`);
}

// ──────────────────────────────────────────────────────────────
// EDITAR CLIENTE
// ──────────────────────────────────────────────────────────────
export async function editarClienteAction(formData: FormData) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID' };

  const nombre = String(formData.get('nombre') || '').trim();
  const tipo = String(formData.get('tipo') || 'particular');
  const cuitRaw = String(formData.get('cuit') || '').trim();
  const cuit = cuitRaw ? limpiarCuit(cuitRaw) : null;
  const condicion_iva = String(formData.get('condicion_iva') || 'consumidor_final');
  const email = String(formData.get('email') || '').trim() || null;
  const telefono = String(formData.get('telefono') || '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') || '').trim() || null;
  const direccion = String(formData.get('direccion') || '').trim() || null;
  const localidad = String(formData.get('localidad') || '').trim() || null;
  const provincia = String(formData.get('provincia') || '').trim() || null;
  const cp = String(formData.get('cp') || '').trim() || null;
  const saldo_str = String(formData.get('saldo_cta_cte') || '0').trim();
  const saldo_cta_cte = parseFloat(saldo_str) || 0;
  const notas_internas = String(formData.get('notas_internas') || '').trim() || null;

  if (!nombre) return { error: 'El nombre es obligatorio' };
  if (cuitRaw && (!cuit || cuit.length !== 11)) {
    return { error: 'El CUIT debe tener 11 dígitos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('clientes')
    .update({
      nombre, tipo, cuit, condicion_iva,
      email, telefono, whatsapp,
      direccion, localidad, provincia, cp,
      saldo_cta_cte, notas_internas,
    })
    .eq('id', id);

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: `Ya existe un cliente con CUIT ${cuit}` };
    }
    return { error: 'Error: ' + error.message };
  }

  revalidatePath('/admin/clientes');
  revalidatePath(`/admin/clientes/${id}`);
  redirect(`/admin/clientes/${id}`);
}

// ──────────────────────────────────────────────────────────────
// TOGGLE ACTIVO
// ──────────────────────────────────────────────────────────────
export async function toggleClienteActivoAction(clienteId: string, activo: boolean) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('clientes')
    .update({ activo })
    .eq('id', clienteId);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/clientes');
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR
// ──────────────────────────────────────────────────────────────
export async function eliminarClienteAction(clienteId: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', clienteId);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/clientes');
  redirect('/admin/clientes');
}
