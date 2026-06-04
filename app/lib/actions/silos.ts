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

// ──────────────────────────────────────────────────────────────
// CREAR SILO
// ──────────────────────────────────────────────────────────────
export async function crearSiloAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const nombre = String(formData.get('nombre') || '').trim();
  const tipo = String(formData.get('tipo') || 'aereo');
  const ubicacion = String(formData.get('ubicacion') || '').trim() || null;
  const capacidad_str = String(formData.get('capacidad_tn') || '').trim();
  const capacidad_tn = capacidad_str ? parseFloat(capacidad_str) : null;
  const observaciones = String(formData.get('observaciones') || '').trim() || null;

  if (!nombre) return { error: 'El nombre es obligatorio' };
  if (capacidad_tn !== null && capacidad_tn <= 0) {
    return { error: 'La capacidad debe ser mayor a 0' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('silos')
    .insert({
      productor_id: ctx.productor.id,
      nombre, tipo, ubicacion, capacidad_tn, observaciones,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: `Ya existe un silo con el nombre "${nombre}"` };
    }
    return { error: 'Error al crear: ' + error.message };
  }

  revalidatePath('/admin/silos');
  redirect(`/admin/silos/${data.id}`);
}

// ──────────────────────────────────────────────────────────────
// EDITAR SILO
// ──────────────────────────────────────────────────────────────
export async function editarSiloAction(formData: FormData) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID' };

  const nombre = String(formData.get('nombre') || '').trim();
  const tipo = String(formData.get('tipo') || 'aereo');
  const ubicacion = String(formData.get('ubicacion') || '').trim() || null;
  const capacidad_str = String(formData.get('capacidad_tn') || '').trim();
  const capacidad_tn = capacidad_str ? parseFloat(capacidad_str) : null;
  const observaciones = String(formData.get('observaciones') || '').trim() || null;

  if (!nombre) return { error: 'El nombre es obligatorio' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('silos')
    .update({ nombre, tipo, ubicacion, capacidad_tn, observaciones })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/silos');
  revalidatePath(`/admin/silos/${id}`);
  redirect(`/admin/silos/${id}`);
}

// ──────────────────────────────────────────────────────────────
// TOGGLE ACTIVO
// ──────────────────────────────────────────────────────────────
export async function toggleSiloActivoAction(siloId: string, activo: boolean) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('silos')
    .update({ activo })
    .eq('id', siloId);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/silos');
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR SILO
// ──────────────────────────────────────────────────────────────
export async function eliminarSiloAction(siloId: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('silos')
    .delete()
    .eq('id', siloId);

  if (error) {
    if (error.message.includes('foreign key')) {
      return { error: 'No se puede eliminar: el silo tiene movimientos. Eliminá primero los movimientos.' };
    }
    return { error: 'Error: ' + error.message };
  }

  revalidatePath('/admin/silos');
  redirect('/admin/silos');
}

// ──────────────────────────────────────────────────────────────
// REGISTRAR MOVIMIENTO
// ──────────────────────────────────────────────────────────────
export async function registrarMovimientoAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const silo_id = String(formData.get('silo_id') || '');
  const producto_id = String(formData.get('producto_id') || '');
  const tipo = String(formData.get('tipo') || '') as 'entrada' | 'salida';
  const cantidad_str = String(formData.get('cantidad_tn') || '').trim();
  const cantidad_tn = parseFloat(cantidad_str);
  const campania = String(formData.get('campania') || '').trim() || null;
  const fecha = String(formData.get('fecha') || '').trim() || new Date().toISOString().slice(0, 10);
  const observaciones = String(formData.get('observaciones') || '').trim() || null;

  if (!silo_id) return { error: 'Falta el silo' };
  if (!producto_id) return { error: 'Falta el producto' };
  if (tipo !== 'entrada' && tipo !== 'salida') return { error: 'Tipo inválido' };
  if (!cantidad_tn || cantidad_tn <= 0) return { error: 'La cantidad debe ser mayor a 0' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si es salida, validar que haya stock suficiente
  if (tipo === 'salida') {
    const { data: stockData } = await supabase
      .from('stock_silos')
      .select('stock_actual_tn')
      .eq('silo_id', silo_id)
      .eq('producto_id', producto_id)
      .eq('campania', campania ?? '—');

    const stockActual = (stockData ?? []).reduce(
      (s, r) => s + (Number(r.stock_actual_tn) || 0),
      0
    );

    if (stockActual < cantidad_tn) {
      return {
        error: `Stock insuficiente. Disponible: ${stockActual.toFixed(2)} tn. Pediste salida de ${cantidad_tn} tn.`,
      };
    }
  }

  const { error } = await supabase
    .from('movimientos_silo')
    .insert({
      productor_id: ctx.productor.id,
      silo_id,
      producto_id,
      tipo,
      cantidad_tn,
      campania,
      fecha,
      observaciones,
      registrado_por: user?.id ?? null,
    });

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/silos');
  revalidatePath(`/admin/silos/${silo_id}`);
  redirect(`/admin/silos/${silo_id}`);
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR MOVIMIENTO
// ──────────────────────────────────────────────────────────────
export async function eliminarMovimientoAction(movimientoId: string, siloId: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('movimientos_silo')
    .delete()
    .eq('id', movimientoId);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath(`/admin/silos/${siloId}`);
  return { ok: true };
}
