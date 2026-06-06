'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type FormaCobro = 'efectivo' | 'transferencia' | 'cheque_recibido' | 'tarjeta' | 'otro';

type Imputacion = {
  factura_id: string;
  importe: number;
};

type ChequeData = {
  numero: string;
  banco_emisor: string;
  fecha_emision: string;
  fecha_cobro: string;
  importe: number;
  librador: string;
};

// ─────────────────────────────────────────────────────────────
// Crear cobro — toda la operación corre ATÓMICA dentro del RPC
// aplicar_cobro (migración 16). Si algo falla, Postgres hace
// rollback completo: no quedan cobros, facturas ni saldos a medias.
// ─────────────────────────────────────────────────────────────
export async function crearCobroAction(payload: {
  cliente_id: string;
  fecha: string;
  forma_cobro: FormaCobro;
  imputaciones: Imputacion[];
  notas?: string | null;
  cheque?: ChequeData | null;
}) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  if (!payload.cliente_id) return { error: 'Falta cliente' };
  if (!payload.fecha) return { error: 'Falta fecha' };
  if (!payload.imputaciones || payload.imputaciones.length === 0)
    return { error: 'Imputá el cobro a al menos una factura' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Datos del cheque (el a_nombre_de se calcula acá porque depende del productor)
  let chequeJson: Record<string, unknown> | null = null;
  if (payload.forma_cobro === 'cheque_recibido') {
    if (!payload.cheque) return { error: 'Faltan datos del cheque recibido' };
    chequeJson = {
      numero: payload.cheque.numero,
      banco_emisor: payload.cheque.banco_emisor,
      fecha_emision: payload.cheque.fecha_emision,
      fecha_cobro: payload.cheque.fecha_cobro,
      importe: payload.cheque.importe,
      librador: payload.cheque.librador,
      a_nombre_de: ctx.productor.nombre_campo || ctx.productor.nombre,
    };
  }

  const { data: cobroId, error } = await supabase.rpc('aplicar_cobro', {
    p_productor_id: ctx.productor.id,
    p_cliente_id: payload.cliente_id,
    p_fecha: payload.fecha,
    p_forma_cobro: payload.forma_cobro,
    p_imputaciones: payload.imputaciones,
    p_notas: payload.notas?.trim() || null,
    p_cheque: chequeJson,
    p_registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/cobros');
  revalidatePath('/admin/facturas');
  revalidatePath('/admin/clientes');
  revalidatePath(`/admin/clientes/${payload.cliente_id}`);

  redirect(`/admin/cobros/${cobroId}`);
}

// ─────────────────────────────────────────────────────────────
// Anular cobro — revierte todo de forma ATÓMICA vía RPC anular_cobro.
// ─────────────────────────────────────────────────────────────
export async function anularCobroAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.rpc('anular_cobro', {
    p_cobro_id: id,
    p_productor_id: ctx.productor.id,
    p_anulado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/cobros');
  revalidatePath(`/admin/cobros/${id}`);
  revalidatePath('/admin/facturas');
  revalidatePath('/admin/clientes');
  return { ok: true };
}
