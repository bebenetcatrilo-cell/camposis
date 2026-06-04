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

// ════════════════════════════════════════════════════════════
// CHEQUES RECIBIDOS
// ════════════════════════════════════════════════════════════

export async function crearChequeRecibidoAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const numero = String(formData.get('numero') || '').trim();
  const banco_emisor = String(formData.get('banco_emisor') || '').trim();
  const fecha_emision = String(formData.get('fecha_emision') || '').trim();
  const fecha_cobro = String(formData.get('fecha_cobro') || '').trim();
  const importe = parseFloat(String(formData.get('importe') || '0'));
  const a_nombre_de = String(formData.get('a_nombre_de') || '').trim() || null;
  const cliente_id = String(formData.get('cliente_id') || '').trim() || null;
  const factura_id = String(formData.get('factura_id') || '').trim() || null;
  const notas = String(formData.get('notas') || '').trim() || null;

  if (!numero) return { error: 'Falta el Nº de cheque' };
  if (!banco_emisor) return { error: 'Falta el banco emisor' };
  if (!fecha_emision) return { error: 'Falta la fecha de emisión' };
  if (!fecha_cobro) return { error: 'Falta la fecha de cobro' };
  if (!importe || importe <= 0) return { error: 'El importe debe ser mayor a 0' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('cheques_recibidos')
    .insert({
      productor_id: ctx.productor.id,
      numero, banco_emisor, fecha_emision, fecha_cobro, importe,
      a_nombre_de, cliente_id, factura_id, notas,
      estado: 'cartera',
      registrado_por: user?.id ?? null,
    })
    .select()
    .single();

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/cheques');
  redirect(`/admin/cheques/recibido/${data.id}`);
}

export async function editarChequeRecibidoAction(formData: FormData) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID' };

  const numero = String(formData.get('numero') || '').trim();
  const banco_emisor = String(formData.get('banco_emisor') || '').trim();
  const fecha_emision = String(formData.get('fecha_emision') || '').trim();
  const fecha_cobro = String(formData.get('fecha_cobro') || '').trim();
  const importe = parseFloat(String(formData.get('importe') || '0'));
  const a_nombre_de = String(formData.get('a_nombre_de') || '').trim() || null;
  const cliente_id = String(formData.get('cliente_id') || '').trim() || null;
  const factura_id = String(formData.get('factura_id') || '').trim() || null;
  const notas = String(formData.get('notas') || '').trim() || null;

  if (!numero || !banco_emisor || !fecha_emision || !fecha_cobro) {
    return { error: 'Faltan campos obligatorios' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('cheques_recibidos')
    .update({
      numero, banco_emisor, fecha_emision, fecha_cobro, importe,
      a_nombre_de, cliente_id, factura_id, notas,
    })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/cheques');
  revalidatePath(`/admin/cheques/recibido/${id}`);
  return { ok: true };
}

// Cambiar estado de un cheque recibido con datos extra
export async function cambiarEstadoChequeRecibidoAction(
  id: string,
  nuevoEstado: 'cartera' | 'depositado' | 'acreditado' | 'rechazado' | 'endosado' | 'vendido' | 'anulado',
  data?: {
    banco_deposito?: string;
    fecha_deposito?: string;
    banco_venta?: string;
    fecha_venta?: string;
    monto_recibido?: number;
    endosado_a?: string;
    fecha_endoso?: string;
    fecha_rechazo?: string;
    motivo_rechazo?: string;
  }
) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();

  // Obtener importe para calcular comisión si es venta
  const { data: cheque } = await supabase
    .from('cheques_recibidos')
    .select('importe')
    .eq('id', id)
    .single();

  const updates: any = { estado: nuevoEstado };

  if (nuevoEstado === 'depositado') {
    updates.banco_deposito = data?.banco_deposito ?? null;
    updates.fecha_deposito = data?.fecha_deposito ?? new Date().toISOString().slice(0, 10);
  } else if (nuevoEstado === 'acreditado') {
    if (!data?.fecha_deposito) {
      // mantener fecha de depósito si ya tenía
    }
  } else if (nuevoEstado === 'vendido') {
    updates.banco_venta = data?.banco_venta ?? null;
    updates.fecha_venta = data?.fecha_venta ?? new Date().toISOString().slice(0, 10);
    updates.monto_recibido = data?.monto_recibido ?? null;
    if (data?.monto_recibido && cheque?.importe) {
      updates.comision_venta = Number(cheque.importe) - Number(data.monto_recibido);
    }
  } else if (nuevoEstado === 'endosado') {
    updates.endosado_a = data?.endosado_a ?? null;
    updates.fecha_endoso = data?.fecha_endoso ?? new Date().toISOString().slice(0, 10);
  } else if (nuevoEstado === 'rechazado') {
    updates.fecha_rechazo = data?.fecha_rechazo ?? new Date().toISOString().slice(0, 10);
    updates.motivo_rechazo = data?.motivo_rechazo ?? null;
  }

  const { error } = await supabase
    .from('cheques_recibidos')
    .update(updates)
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/cheques');
  revalidatePath(`/admin/cheques/recibido/${id}`);
  return { ok: true };
}

export async function eliminarChequeRecibidoAction(id: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('cheques_recibidos')
    .delete()
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/cheques');
  redirect('/admin/cheques?tab=recibidos');
}

// ════════════════════════════════════════════════════════════
// CHEQUES EMITIDOS
// ════════════════════════════════════════════════════════════

export async function crearChequeEmitidoAction(formData: FormData) {
  let ctx;
  try {
    ctx = await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const numero = String(formData.get('numero') || '').trim();
  const banco_propio = String(formData.get('banco_propio') || '').trim();
  const fecha_emision = String(formData.get('fecha_emision') || '').trim();
  const fecha_pago = String(formData.get('fecha_pago') || '').trim();
  const importe = parseFloat(String(formData.get('importe') || '0'));
  const beneficiario = String(formData.get('beneficiario') || '').trim();
  const concepto = String(formData.get('concepto') || '').trim() || null;
  const notas = String(formData.get('notas') || '').trim() || null;

  if (!numero) return { error: 'Falta el Nº de cheque' };
  if (!banco_propio) return { error: 'Falta el banco propio' };
  if (!fecha_emision || !fecha_pago) return { error: 'Faltan fechas' };
  if (!importe || importe <= 0) return { error: 'Importe inválido' };
  if (!beneficiario) return { error: 'Falta el beneficiario' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('cheques_emitidos')
    .insert({
      productor_id: ctx.productor.id,
      numero, banco_propio, fecha_emision, fecha_pago, importe,
      beneficiario, concepto, notas,
      estado: 'emitido',
      registrado_por: user?.id ?? null,
    })
    .select()
    .single();

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/cheques');
  redirect(`/admin/cheques/emitido/${data.id}`);
}

export async function editarChequeEmitidoAction(formData: FormData) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const id = String(formData.get('id') || '');
  if (!id) return { error: 'Falta el ID' };

  const numero = String(formData.get('numero') || '').trim();
  const banco_propio = String(formData.get('banco_propio') || '').trim();
  const fecha_emision = String(formData.get('fecha_emision') || '').trim();
  const fecha_pago = String(formData.get('fecha_pago') || '').trim();
  const importe = parseFloat(String(formData.get('importe') || '0'));
  const beneficiario = String(formData.get('beneficiario') || '').trim();
  const concepto = String(formData.get('concepto') || '').trim() || null;
  const notas = String(formData.get('notas') || '').trim() || null;

  if (!numero || !banco_propio || !beneficiario) {
    return { error: 'Faltan campos obligatorios' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('cheques_emitidos')
    .update({
      numero, banco_propio, fecha_emision, fecha_pago, importe,
      beneficiario, concepto, notas,
    })
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/cheques');
  revalidatePath(`/admin/cheques/emitido/${id}`);
  return { ok: true };
}

export async function cambiarEstadoChequeEmitidoAction(
  id: string,
  nuevoEstado: 'emitido' | 'entregado' | 'cobrado' | 'anulado',
  data?: { fecha_entrega?: string; fecha_cobro?: string }
) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const updates: any = { estado: nuevoEstado };
  if (nuevoEstado === 'entregado') {
    updates.fecha_entrega = data?.fecha_entrega ?? new Date().toISOString().slice(0, 10);
  } else if (nuevoEstado === 'cobrado') {
    updates.fecha_cobro = data?.fecha_cobro ?? new Date().toISOString().slice(0, 10);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('cheques_emitidos')
    .update(updates)
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };

  revalidatePath('/admin/cheques');
  revalidatePath(`/admin/cheques/emitido/${id}`);
  return { ok: true };
}

export async function eliminarChequeEmitidoAction(id: string) {
  try {
    await asegurarMiembro();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sin permisos' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('cheques_emitidos')
    .delete()
    .eq('id', id);

  if (error) return { error: 'Error: ' + error.message };
  revalidatePath('/admin/cheques');
  redirect('/admin/cheques?tab=emitidos');
}
