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

const IVA_LABEL: Record<string, string> = {
  ri: 'Responsable Inscripto',
  monotributo: 'Monotributista',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
  no_categorizado: 'No categorizado',
};

// ──────────────────────────────────────────────────────────────
// CREAR FACTURA
// ──────────────────────────────────────────────────────────────
export async function crearFacturaAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const cliente_id = String(formData.get('cliente_id') || '');
  const tipo = String(formData.get('tipo') || '') as 'A' | 'B' | 'C' | 'X';
  const fecha = String(formData.get('fecha') || '').trim() || new Date().toISOString().slice(0, 10);
  const concepto = String(formData.get('concepto') || '').trim() || null;
  const iva_pct = parseFloat(String(formData.get('iva_porcentaje') || '0')) || 0;
  const notas = String(formData.get('notas') || '').trim() || null;
  const presupuesto_id = String(formData.get('presupuesto_id') || '').trim() || null;
  const cae = String(formData.get('cae') || '').trim() || null;
  const cae_vencimiento = String(formData.get('cae_vencimiento') || '').trim() || null;
  const items = parseItems(formData);

  // Estado inicial: por defecto emitida (la idea es que ya está emitida cuando la guardo)
  const estadoInicial = String(formData.get('estado') || 'emitida') as 'borrador' | 'emitida';

  if (!cliente_id) return { error: 'Seleccioná un cliente' };
  if (!['A', 'B', 'C', 'X'].includes(tipo)) return { error: 'Tipo de factura inválido' };
  if (items.length === 0) return { error: 'Agregá al menos un ítem' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Datos del cliente (snapshot)
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, cuit, condicion_iva, direccion, localidad')
    .eq('id', cliente_id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cliente) return { error: 'Cliente no encontrado' };

  // Validación fiscal: Factura A solo a Responsable Inscripto
  if (tipo === 'A' && cliente.condicion_iva !== 'ri') {
    return {
      error: `Factura A solo se puede emitir a Responsables Inscriptos. El cliente "${cliente.nombre}" es ${IVA_LABEL[cliente.condicion_iva]}.`
    };
  }

  // Cálculos
  const subtotal = items.reduce((s, it) => s + (it.cantidad * it.precio_unitario), 0);
  const iva_monto = subtotal * (iva_pct / 100);
  const total = subtotal + iva_monto;

  // Siguiente número
  const punto_venta = ctx.productor.punto_venta || '0001';
  const { data: numData } = await supabase
    .rpc('siguiente_numero_factura', {
      p_productor_id: ctx.productor.id,
      p_tipo: tipo,
      p_punto_venta: punto_venta,
    });
  const numero = (numData as number) ?? 1;

  // Insertar
  const { data: factura, error } = await supabase
    .from('facturas')
    .insert({
      productor_id: ctx.productor.id,
      tipo,
      punto_venta,
      numero,
      fecha,
      cae,
      cae_vencimiento,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_cuit: cliente.cuit,
      cliente_condicion_iva: IVA_LABEL[cliente.condicion_iva] ?? cliente.condicion_iva,
      cliente_direccion: cliente.direccion,
      cliente_localidad: cliente.localidad,
      presupuesto_id: presupuesto_id || null,
      concepto,
      subtotal,
      iva_porcentaje: iva_pct,
      iva_monto,
      total,
      estado: estadoInicial,
      notas,
      creado_por: user?.id ?? null,
    })
    .select()
    .single();

  if (error) return { error: 'Error al crear: ' + error.message };

  // Ítems
  const itemsRows = items.map((it, i) => ({
    factura_id: factura.id,
    producto_id: it.producto_id || null,
    descripcion: it.descripcion.trim(),
    unidad: it.unidad?.trim() || null,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
    orden: i,
  }));

  const { error: errItems } = await supabase
    .from('items_factura')
    .insert(itemsRows);

  if (errItems) {
    await supabase.from('facturas').delete().eq('id', factura.id);
    return { error: 'Error en ítems: ' + errItems.message };
  }

  revalidatePath('/admin/facturas');
  redirect(`/admin/facturas/${factura.id}`);
}

// ──────────────────────────────────────────────────────────────
// EDITAR FACTURA (solo borradores)
// ──────────────────────────────────────────────────────────────
export async function editarFacturaAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID' };

  const supabase = await createClient();

  // Verificar que sea borrador
  const { data: fact } = await supabase
    .from('facturas')
    .select('estado')
    .eq('id', id)
    .single();

  if (!fact) return { error: 'Factura no encontrada' };
  if (fact.estado !== 'borrador') {
    return { error: 'Solo podés editar facturas en estado borrador. Las emitidas no se pueden modificar (anulalas y creá una nueva).' };
  }

  const cliente_id = String(formData.get('cliente_id') || '');
  const tipo = String(formData.get('tipo') || '') as 'A' | 'B' | 'C' | 'X';
  const fecha = String(formData.get('fecha') || '').trim();
  const concepto = String(formData.get('concepto') || '').trim() || null;
  const iva_pct = parseFloat(String(formData.get('iva_porcentaje') || '0')) || 0;
  const notas = String(formData.get('notas') || '').trim() || null;
  const cae = String(formData.get('cae') || '').trim() || null;
  const cae_vencimiento = String(formData.get('cae_vencimiento') || '').trim() || null;
  const items = parseItems(formData);

  if (!cliente_id) return { error: 'Seleccioná un cliente' };
  if (items.length === 0) return { error: 'Agregá al menos un ítem' };

  // Cliente
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, cuit, condicion_iva, direccion, localidad')
    .eq('id', cliente_id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cliente) return { error: 'Cliente no encontrado' };

  if (tipo === 'A' && cliente.condicion_iva !== 'ri') {
    return {
      error: `Factura A solo se emite a Responsables Inscriptos. "${cliente.nombre}" es ${IVA_LABEL[cliente.condicion_iva]}.`,
    };
  }

  const subtotal = items.reduce((s, it) => s + (it.cantidad * it.precio_unitario), 0);
  const iva_monto = subtotal * (iva_pct / 100);
  const total = subtotal + iva_monto;

  const { error } = await supabase
    .from('facturas')
    .update({
      tipo,
      fecha,
      cae,
      cae_vencimiento,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_cuit: cliente.cuit,
      cliente_condicion_iva: IVA_LABEL[cliente.condicion_iva] ?? cliente.condicion_iva,
      cliente_direccion: cliente.direccion,
      cliente_localidad: cliente.localidad,
      concepto,
      subtotal,
      iva_porcentaje: iva_pct,
      iva_monto,
      total,
      notas,
    })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  await supabase.from('items_factura').delete().eq('factura_id', id);

  const itemsRows = items.map((it, i) => ({
    factura_id: id,
    producto_id: it.producto_id || null,
    descripcion: it.descripcion.trim(),
    unidad: it.unidad?.trim() || null,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
    orden: i,
  }));

  const { error: errItems } = await supabase
    .from('items_factura')
    .insert(itemsRows);

  if (errItems) return { error: 'Error en ítems: ' + errItems.message };

  revalidatePath('/admin/facturas');
  revalidatePath(`/admin/facturas/${id}`);
  redirect(`/admin/facturas/${id}`);
}

// ──────────────────────────────────────────────────────────────
// CAMBIAR ESTADO
// ──────────────────────────────────────────────────────────────
export async function cambiarEstadoFacturaAction(
  id: string,
  nuevoEstado: 'borrador' | 'emitida' | 'cobrada' | 'anulada',
  data?: {
    forma_pago?: string;
    fecha_cobro?: string;
    observaciones_cobro?: string;
  }
) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();

  const updates: any = { estado: nuevoEstado };
  if (nuevoEstado === 'cobrada') {
    updates.forma_pago = data?.forma_pago ?? null;
    updates.fecha_cobro = data?.fecha_cobro ?? new Date().toISOString().slice(0, 10);
    updates.observaciones_cobro = data?.observaciones_cobro ?? null;
  } else if (nuevoEstado === 'anulada') {
    updates.observaciones_cobro = data?.observaciones_cobro ?? null;
  }

  const { error } = await supabase
    .from('facturas')
    .update(updates)
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/facturas');
  revalidatePath(`/admin/facturas/${id}`);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR
// ──────────────────────────────────────────────────────────────
export async function eliminarFacturaAction(id: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();

  // Solo borradores se pueden eliminar
  const { data: fact } = await supabase
    .from('facturas')
    .select('estado')
    .eq('id', id)
    .single();

  if (!fact) return { error: 'Factura no encontrada' };
  if (fact.estado !== 'borrador') {
    return { error: 'Solo borradores se pueden eliminar. Para sacar una factura emitida, anulala.' };
  }

  const { error } = await supabase
    .from('facturas')
    .delete()
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/facturas');
  redirect('/admin/facturas');
}

// ──────────────────────────────────────────────────────────────
// CARGAR CAE (después de emitir manual)
// ──────────────────────────────────────────────────────────────
export async function cargarCaeAction(id: string, cae: string, vencimiento: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  if (!cae.trim()) return { error: 'CAE vacío' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('facturas')
    .update({
      cae: cae.trim(),
      cae_vencimiento: vencimiento || null,
    })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath(`/admin/facturas/${id}`);
  return { ok: true };
}
