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

// ═══════════════════════════════════════════════════════════
// DUPLICAR PRESUPUESTO
// ═══════════════════════════════════════════════════════════
export async function duplicarPresupuestoAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();

  // 1) Cargar presupuesto original
  const { data: orig } = await supabase
    .from('presupuestos')
    .select('*, items:items_presupuesto(*)')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!orig) return { error: 'Presupuesto no encontrado' };

  // 2) Generar nuevo número
  const { data: numData } = await supabase
    .rpc('siguiente_numero_presupuesto', { p_productor_id: ctx.productor.id });
  const numero = (numData as number) ?? 1;

  // 3) Generar token público nuevo
  const token_publico = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // 4) Calcular nueva fecha de hoy + vencimiento sumando los mismos días
  const hoy = new Date().toISOString().slice(0, 10);
  let nuevoVencimiento = null;
  if (orig.fecha_vencimiento && orig.fecha) {
    const diasOriginal = Math.floor(
      (new Date(orig.fecha_vencimiento).getTime() - new Date(orig.fecha).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diasOriginal > 0) {
      const v = new Date();
      v.setDate(v.getDate() + diasOriginal);
      nuevoVencimiento = v.toISOString().slice(0, 10);
    }
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 5) Crear copia
  const { data: nuevo, error } = await supabase
    .from('presupuestos')
    .insert({
      productor_id: ctx.productor.id,
      numero,
      fecha: hoy,
      fecha_vencimiento: nuevoVencimiento,
      cliente_id: orig.cliente_id,
      cliente_nombre: orig.cliente_nombre,
      cliente_cuit: orig.cliente_cuit,
      cliente_condicion_iva: orig.cliente_condicion_iva,
      cliente_direccion: orig.cliente_direccion,
      cliente_localidad: orig.cliente_localidad,
      concepto: orig.concepto ? `${orig.concepto} (copia)` : '(copia)',
      subtotal: orig.subtotal,
      iva_porcentaje: orig.iva_porcentaje,
      iva_monto: orig.iva_monto,
      total: orig.total,
      estado: 'pendiente',
      notas: orig.notas,
      token_publico,
      creado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // 6) Copiar items
  if (orig.items && orig.items.length > 0) {
    const items = orig.items.map((it: any, idx: number) => ({
      presupuesto_id: nuevo.id,
      descripcion: it.descripcion,
      unidad: it.unidad,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      subtotal: it.subtotal,
      orden: it.orden ?? idx,
    }));
    await supabase.from('items_presupuesto').insert(items);
  }

  revalidatePath('/admin/presupuestos');
  redirect(`/admin/presupuestos/${nuevo.id}`);
}

// ═══════════════════════════════════════════════════════════
// CONVERTIR PRESUPUESTO A FACTURA
// ═══════════════════════════════════════════════════════════
type TipoFact = 'A' | 'B' | 'C' | 'X';

export async function convertirPresupuestoAFacturaAction(
  presupuestoId: string,
  tipoFactura: TipoFact
) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();

  // 1) Cargar presupuesto
  const { data: pres } = await supabase
    .from('presupuestos')
    .select('*, items:items_presupuesto(*)')
    .eq('id', presupuestoId)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!pres) return { error: 'Presupuesto no encontrado' };
  if (pres.estado === 'rechazado') return { error: 'No podés facturar un presupuesto rechazado' };

  // 2) Obtener datos del productor (punto_venta)
  const { data: productor } = await supabase
    .from('productores')
    .select('punto_venta')
    .eq('id', ctx.productor.id)
    .single();
  const punto_venta = productor?.punto_venta || '0001';

  // 3) Siguiente número de factura
  const { data: numData } = await supabase.rpc('siguiente_numero_factura', {
    p_productor_id: ctx.productor.id,
    p_tipo: tipoFactura,
    p_punto_venta: punto_venta,
  });
  const numero = (numData as number) ?? 1;

  const { data: { user } } = await supabase.auth.getUser();

  // 4) Crear factura en BORRADOR con todos los datos del presupuesto
  const numFmt = String(pres.numero).padStart(4, '0');
  const { data: factura, error } = await supabase
    .from('facturas')
    .insert({
      productor_id: ctx.productor.id,
      tipo: tipoFactura,
      punto_venta,
      numero,
      fecha: new Date().toISOString().slice(0, 10),
      cliente_id: pres.cliente_id,
      cliente_nombre: pres.cliente_nombre,
      cliente_cuit: pres.cliente_cuit,
      cliente_condicion_iva: pres.cliente_condicion_iva,
      cliente_direccion: pres.cliente_direccion,
      cliente_localidad: pres.cliente_localidad,
      presupuesto_id: pres.id,
      concepto: pres.concepto,
      subtotal: pres.subtotal,
      iva_porcentaje: pres.iva_porcentaje,
      iva_monto: pres.iva_monto,
      total: pres.total,
      estado: 'borrador',
      notas: pres.notas
        ? `${pres.notas}\n\nBasado en Presupuesto #${numFmt}`
        : `Basado en Presupuesto #${numFmt}`,
      creado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // 5) Copiar items
  if (pres.items && pres.items.length > 0) {
    const items = pres.items.map((it: any, idx: number) => ({
      factura_id: factura.id,
      descripcion: it.descripcion,
      unidad: it.unidad,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      subtotal: it.subtotal,
      orden: it.orden ?? idx,
    }));
    await supabase.from('items_factura').insert(items);
  }

  // 6) Marcar presupuesto como facturado
  await supabase
    .from('presupuestos')
    .update({ estado: 'facturado' })
    .eq('id', presupuestoId);

  revalidatePath('/admin/presupuestos');
  revalidatePath('/admin/facturas');
  redirect(`/admin/facturas/${factura.id}`);
}
