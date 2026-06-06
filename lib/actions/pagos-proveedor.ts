'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type FormaPagoProv = 'efectivo' | 'transferencia' | 'cheque_propio' | 'cheque_endoso' | 'tarjeta' | 'otro';

type Imputacion = {
  compra_id: string;
  importe: number;
};

type ChequePropio = {
  numero: string;
  banco_propio: string;
  fecha_emision: string;
  fecha_pago: string;
  importe: number;
};

// ─────────────────────────────────────────────────────────────
// Crear pago a proveedor — toda la operación corre ATÓMICA dentro
// del RPC aplicar_pago_proveedor (migración 18). Si algo falla,
// Postgres hace rollback completo: no quedan pagos, compras, cheques
// ni saldos a medias.
// ─────────────────────────────────────────────────────────────
export async function crearPagoProveedorAction(payload: {
  proveedor_id: string;
  fecha: string;
  forma_pago: FormaPagoProv;
  imputaciones: Imputacion[];
  notas?: string | null;
  cheque_propio?: ChequePropio | null;
  cheque_recibido_id?: string | null;
}) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins pueden registrar pagos' };

  if (!payload.proveedor_id) return { error: 'Falta proveedor' };
  if (!payload.fecha) return { error: 'Falta fecha' };
  if (!payload.imputaciones || payload.imputaciones.length === 0)
    return { error: 'Tenés que imputar el pago a al menos una compra' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let chequePropioJson: Record<string, unknown> | null = null;
  if (payload.forma_pago === 'cheque_propio') {
    if (!payload.cheque_propio) return { error: 'Faltan datos del cheque propio' };
    chequePropioJson = {
      numero: payload.cheque_propio.numero,
      banco_propio: payload.cheque_propio.banco_propio,
      fecha_emision: payload.cheque_propio.fecha_emision,
      fecha_pago: payload.cheque_propio.fecha_pago,
      importe: payload.cheque_propio.importe,
    };
  }

  const { data: pagoId, error } = await supabase.rpc('aplicar_pago_proveedor', {
    p_productor_id: ctx.productor.id,
    p_proveedor_id: payload.proveedor_id,
    p_fecha: payload.fecha,
    p_forma_pago: payload.forma_pago,
    p_imputaciones: payload.imputaciones,
    p_notas: payload.notas?.trim() || null,
    p_cheque_propio: chequePropioJson,
    p_cheque_recibido_id: payload.forma_pago === 'cheque_endoso' ? (payload.cheque_recibido_id ?? null) : null,
    p_registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/pagos-proveedor');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/proveedores');
  revalidatePath(`/admin/proveedores/${payload.proveedor_id}`);

  redirect(`/admin/pagos-proveedor/${pagoId}`);
}

// ─────────────────────────────────────────────────────────────
// Anular pago a proveedor — revierte todo de forma ATÓMICA vía RPC.
// ─────────────────────────────────────────────────────────────
export async function anularPagoProveedorAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.rpc('anular_pago_proveedor', {
    p_pago_id: id,
    p_productor_id: ctx.productor.id,
    p_anulado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/pagos-proveedor');
  revalidatePath(`/admin/pagos-proveedor/${id}`);
  revalidatePath('/admin/compras');
  revalidatePath('/admin/proveedores');
  return { ok: true };
}
