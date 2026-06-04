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

type ItemInput = {
  producto_id: string | null;
  descripcion: string;
  unidad: string | null;
  cantidad: number;
  precio_unitario: number;
};

function parseItems(formData: FormData): ItemInput[] {
  const itemsJson = String(formData.get('items_json') || '[]');
  try {
    const arr = JSON.parse(itemsJson);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────
// CREAR PRESUPUESTO
// ──────────────────────────────────────────────────────────────
export async function crearPresupuestoAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const cliente_id = String(formData.get('cliente_id') || '');
  const fecha = String(formData.get('fecha') || '').trim() || new Date().toISOString().slice(0, 10);
  const fecha_vencimiento = String(formData.get('fecha_vencimiento') || '').trim() || null;
  const concepto = String(formData.get('concepto') || '').trim() || null;
  const iva_pct = parseFloat(String(formData.get('iva_porcentaje') || '0')) || 0;
  const notas = String(formData.get('notas') || '').trim() || null;
  const items = parseItems(formData);

  if (!cliente_id) return { error: 'Tenés que seleccionar un cliente' };
  if (items.length === 0) return { error: 'Agregá al menos un ítem' };

  // Validar items
  for (const it of items) {
    if (!it.descripcion?.trim()) return { error: 'Hay ítems sin descripción' };
    if (it.cantidad < 0) return { error: 'Hay cantidades negativas' };
    if (it.precio_unitario < 0) return { error: 'Hay precios negativos' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Traer datos del cliente (snapshot)
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, cuit, condicion_iva, direccion, localidad')
    .eq('id', cliente_id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cliente) return { error: 'Cliente no encontrado' };

  // Calcular totales
  const subtotal = items.reduce((s, it) => s + (it.cantidad * it.precio_unitario), 0);
  const iva_monto = subtotal * (iva_pct / 100);
  const total = subtotal + iva_monto;

  // Mapear condición IVA a texto legible
  const ivaLabel: Record<string, string> = {
    ri: 'Responsable Inscripto',
    monotributo: 'Monotributista',
    exento: 'Exento',
    consumidor_final: 'Consumidor Final',
    no_categorizado: 'No categorizado',
  };

  // Obtener siguiente número
  const { data: numData } = await supabase
    .rpc('siguiente_numero_presupuesto', { p_productor_id: ctx.productor.id });
  const numero = (numData as number) ?? 1;

  // Generar token público único (para compartir por link sin login)
  const token_publico = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // Crear presupuesto
  const { data: pres, error } = await supabase
    .from('presupuestos')
    .insert({
      productor_id: ctx.productor.id,
      numero,
      fecha,
      fecha_vencimiento,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_cuit: cliente.cuit,
      cliente_condicion_iva: ivaLabel[cliente.condicion_iva] ?? cliente.condicion_iva,
      cliente_direccion: cliente.direccion,
      cliente_localidad: cliente.localidad,
      concepto,
      subtotal,
      iva_porcentaje: iva_pct,
      iva_monto,
      total,
      estado: 'pendiente',
      notas,
      token_publico,
      creado_por: user?.id ?? null,
    })
    .select()
    .single();

  if (error) return { error: 'Error al crear: ' + error.message };

  // Insertar ítems
  const itemsRows = items.map((it, i) => ({
    presupuesto_id: pres.id,
    producto_id: it.producto_id || null,
    descripcion: it.descripcion.trim(),
    unidad: it.unidad?.trim() || null,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
    orden: i,
  }));

  const { error: errItems } = await supabase
    .from('items_presupuesto')
    .insert(itemsRows);

  if (errItems) {
    // Rollback manual
    await supabase.from('presupuestos').delete().eq('id', pres.id);
    return { error: 'Error guardando ítems: ' + errItems.message };
  }

  revalidatePath('/admin/presupuestos');
  redirect(`/admin/presupuestos/${pres.id}`);
}

// ──────────────────────────────────────────────────────────────
// EDITAR PRESUPUESTO
// ──────────────────────────────────────────────────────────────
export async function editarPresupuestoAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID' };

  const cliente_id = String(formData.get('cliente_id') || '');
  const fecha = String(formData.get('fecha') || '').trim();
  const fecha_vencimiento = String(formData.get('fecha_vencimiento') || '').trim() || null;
  const concepto = String(formData.get('concepto') || '').trim() || null;
  const iva_pct = parseFloat(String(formData.get('iva_porcentaje') || '0')) || 0;
  const notas = String(formData.get('notas') || '').trim() || null;
  const items = parseItems(formData);

  if (!cliente_id) return { error: 'Seleccioná un cliente' };
  if (items.length === 0) return { error: 'Agregá al menos un ítem' };

  const supabase = await createClient();

  // Cliente snapshot
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, cuit, condicion_iva, direccion, localidad')
    .eq('id', cliente_id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cliente) return { error: 'Cliente no encontrado' };

  const ivaLabel: Record<string, string> = {
    ri: 'Responsable Inscripto',
    monotributo: 'Monotributista',
    exento: 'Exento',
    consumidor_final: 'Consumidor Final',
    no_categorizado: 'No categorizado',
  };

  const subtotal = items.reduce((s, it) => s + (it.cantidad * it.precio_unitario), 0);
  const iva_monto = subtotal * (iva_pct / 100);
  const total = subtotal + iva_monto;

  // Actualizar encabezado
  const { error } = await supabase
    .from('presupuestos')
    .update({
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_cuit: cliente.cuit,
      cliente_condicion_iva: ivaLabel[cliente.condicion_iva] ?? cliente.condicion_iva,
      cliente_direccion: cliente.direccion,
      cliente_localidad: cliente.localidad,
      fecha,
      fecha_vencimiento,
      concepto,
      subtotal,
      iva_porcentaje: iva_pct,
      iva_monto,
      total,
      notas,
    })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  // Borrar ítems viejos y meter nuevos (más simple que diff)
  await supabase.from('items_presupuesto').delete().eq('presupuesto_id', id);

  const itemsRows = items.map((it, i) => ({
    presupuesto_id: id,
    producto_id: it.producto_id || null,
    descripcion: it.descripcion.trim(),
    unidad: it.unidad?.trim() || null,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
    orden: i,
  }));

  const { error: errItems } = await supabase
    .from('items_presupuesto')
    .insert(itemsRows);

  if (errItems) return { error: 'Error en ítems: ' + errItems.message };

  revalidatePath('/admin/presupuestos');
  revalidatePath(`/admin/presupuestos/${id}`);
  redirect(`/admin/presupuestos/${id}`);
}

// ──────────────────────────────────────────────────────────────
// CAMBIAR ESTADO
// ──────────────────────────────────────────────────────────────
export async function cambiarEstadoPresupuestoAction(
  id: string,
  nuevoEstado: 'pendiente' | 'aprobado' | 'rechazado'
) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('presupuestos')
    .update({ estado: nuevoEstado })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/presupuestos');
  revalidatePath(`/admin/presupuestos/${id}`);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR
// ──────────────────────────────────────────────────────────────
export async function eliminarPresupuestoAction(id: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/presupuestos');
  redirect('/admin/presupuestos');
}
