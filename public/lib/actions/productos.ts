'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ──────────────────────────────────────────────────────────────
async function asegurarMiembro() {
  const ctx = await getProductorActivo();
  if (!ctx) throw new Error('Sin productor activo');
  return ctx;
}

// ──────────────────────────────────────────────────────────────
// CREAR PRODUCTO
// ──────────────────────────────────────────────────────────────
export async function crearProductoAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const tipo = String(formData.get('tipo') || '') as 'cereal' | 'hacienda';
  const nombre = String(formData.get('nombre') || '').trim();
  const unidad = String(formData.get('unidad') || 'tn');
  const observaciones = String(formData.get('observaciones') || '').trim() || null;

  // Cereal
  const especie = String(formData.get('especie') || '').trim() || null;
  const variedad = String(formData.get('variedad') || '').trim() || null;
  const campania = String(formData.get('campania') || '').trim() || null;
  const grado = String(formData.get('grado') || '').trim() || null;

  // Hacienda
  const categoria = String(formData.get('categoria') || '').trim() || null;
  const raza = String(formData.get('raza') || '').trim() || null;
  const sexo = String(formData.get('sexo') || '') || null;
  const edad_str = String(formData.get('edad_aprox_meses') || '').trim();
  const peso_str = String(formData.get('peso_promedio_kg') || '').trim();
  const edad_aprox_meses = edad_str ? parseInt(edad_str) : null;
  const peso_promedio_kg = peso_str ? parseFloat(peso_str) : null;

  if (!tipo || (tipo !== 'cereal' && tipo !== 'hacienda')) {
    return { error: 'Tipo inválido' };
  }
  if (!nombre) return { error: 'El nombre es obligatorio' };
  if (!unidad) return { error: 'La unidad es obligatoria' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('productos')
    .insert({
      productor_id: ctx.productor.id,
      tipo,
      nombre,
      unidad,
      observaciones,
      especie: tipo === 'cereal' ? especie : null,
      variedad: tipo === 'cereal' ? variedad : null,
      campania: tipo === 'cereal' ? campania : null,
      grado: tipo === 'cereal' ? grado : null,
      categoria: tipo === 'hacienda' ? categoria : null,
      raza: tipo === 'hacienda' ? raza : null,
      sexo: tipo === 'hacienda' ? sexo : null,
      edad_aprox_meses: tipo === 'hacienda' ? edad_aprox_meses : null,
      peso_promedio_kg: tipo === 'hacienda' ? peso_promedio_kg : null,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: `Ya existe un producto "${nombre}" de tipo ${tipo}` };
    }
    return { error: 'Error al crear: ' + error.message };
  }

  revalidatePath('/admin/productos');
  redirect(`/admin/productos/${data.id}`);
}

// ──────────────────────────────────────────────────────────────
// EDITAR PRODUCTO
// ──────────────────────────────────────────────────────────────
export async function editarProductoAction(formData: FormData) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID' };

  const nombre = String(formData.get('nombre') || '').trim();
  const unidad = String(formData.get('unidad') || 'tn');
  const observaciones = String(formData.get('observaciones') || '').trim() || null;

  const especie = String(formData.get('especie') || '').trim() || null;
  const variedad = String(formData.get('variedad') || '').trim() || null;
  const campania = String(formData.get('campania') || '').trim() || null;
  const grado = String(formData.get('grado') || '').trim() || null;

  const categoria = String(formData.get('categoria') || '').trim() || null;
  const raza = String(formData.get('raza') || '').trim() || null;
  const sexo = String(formData.get('sexo') || '') || null;
  const edad_str = String(formData.get('edad_aprox_meses') || '').trim();
  const peso_str = String(formData.get('peso_promedio_kg') || '').trim();
  const edad_aprox_meses = edad_str ? parseInt(edad_str) : null;
  const peso_promedio_kg = peso_str ? parseFloat(peso_str) : null;

  if (!nombre) return { error: 'El nombre es obligatorio' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('productos')
    .update({
      nombre,
      unidad,
      observaciones,
      especie, variedad, campania, grado,
      categoria, raza, sexo, edad_aprox_meses, peso_promedio_kg,
    })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/productos');
  revalidatePath(`/admin/productos/${id}`);
  redirect(`/admin/productos/${id}`);
}

// ──────────────────────────────────────────────────────────────
// ACTIVAR / DESACTIVAR
// ──────────────────────────────────────────────────────────────
export async function toggleProductoActivoAction(productoId: string, activo: boolean) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('productos')
    .update({ activo })
    .eq('id', productoId);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/productos');
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR
// ──────────────────────────────────────────────────────────────
export async function eliminarProductoAction(productoId: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', productoId);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/productos');
  redirect('/admin/productos');
}
