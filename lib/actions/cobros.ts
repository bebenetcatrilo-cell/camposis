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

  const importeTotal = payload.imputaciones.reduce((s, i) => s + Number(i.importe), 0);
  if (importeTotal <= 0) return { error: 'Importe total debe ser > 0' };

  const supabase = await createClient();

  // 1) Cliente
  const { data: cli } = await supabase
    .from('clientes')
    .select('id, nombre, saldo_cta_cte')
    .eq('id', payload.cliente_id)
    .eq('productor_id', ctx.productor.id)
    .single();
  if (!cli) return { error: 'Cliente no encontrado' };

  // 2) Validar facturas
  const facIds = payload.imputaciones.map(i => i.factura_id);
  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, total, monto_cobrado, estado, cliente_id')
    .in('id', facIds)
    .eq('productor_id', ctx.productor.id);

  if (!facturas || facturas.length !== facIds.length)
    return { error: 'Alguna factura no se encontró' };

  for (const imp of payload.imputaciones) {
    const f = facturas.find(x => x.id === imp.factura_id);
    if (!f) return { error: 'Factura no encontrada' };
    if (f.cliente_id !== payload.cliente_id) return { error: 'Hay facturas de otro cliente mezcladas' };
    if (f.estado === 'anulada') return { error: 'No podés cobrar una factura anulada' };
    if (f.estado === 'borrador') return { error: 'No podés cobrar una factura en borrador (emitila primero)' };
    const pendiente = Number(f.total) - Number(f.monto_cobrado);
    if (Number(imp.importe) > pendiente + 0.01) {
      return { error: `Importe en una factura ($${imp.importe}) supera lo pendiente ($${pendiente.toFixed(2)})` };
    }
  }

  // 3) Si forma_cobro = cheque_recibido → crear cheque en cartera
  let chequeRecibidoId: string | null = null;
  const { data: { user } } = await supabase.auth.getUser();

  if (payload.forma_cobro === 'cheque_recibido') {
    if (!payload.cheque) return { error: 'Faltan datos del cheque recibido' };
    const c = payload.cheque;
    if (!c.numero || !c.banco_emisor || !c.fecha_emision || !c.fecha_cobro || c.importe <= 0)
      return { error: 'Datos del cheque incompletos' };
    if (Math.abs(c.importe - importeTotal) > 0.01)
      return { error: `Importe del cheque ($${c.importe}) debe igualar al cobro total ($${importeTotal.toFixed(2)})` };

    const { data: ch, error: errCh } = await supabase
      .from('cheques_recibidos')
      .insert({
        productor_id: ctx.productor.id,
        numero: c.numero,
        banco_emisor: c.banco_emisor,
        fecha_emision: c.fecha_emision,
        fecha_cobro: c.fecha_cobro,
        importe: c.importe,
        a_nombre_de: ctx.productor.nombre_campo || ctx.productor.nombre,
        librador: c.librador || cli.nombre,
        cliente_id: cli.id,
        estado: 'cartera',
        registrado_por: user?.id ?? null,
      })
      .select('id')
      .single();
    if (errCh || !ch) return { error: 'Error al crear cheque: ' + (errCh?.message ?? '') };
    chequeRecibidoId = ch.id;
  }

  // 4) Crear cobro
  const { data: numData } = await supabase.rpc('siguiente_numero_cobro', { p_productor_id: ctx.productor.id });
  const numero = (numData as number) ?? 1;

  const { data: cobro, error: errCobro } = await supabase
    .from('cobros')
    .insert({
      productor_id: ctx.productor.id,
      cliente_id: cli.id,
      numero,
      fecha: payload.fecha,
      cliente_nombre: cli.nombre,
      importe_total: importeTotal,
      forma_cobro: payload.forma_cobro,
      cheque_recibido_id: chequeRecibidoId,
      notas: payload.notas?.trim() || null,
      registrado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (errCobro) return { error: errCobro.message };

  // 5) Imputaciones
  const impData = payload.imputaciones.map(i => ({
    cobro_id: cobro.id,
    factura_id: i.factura_id,
    importe: Number(i.importe),
  }));

  const { error: errImp } = await supabase.from('cobro_imputaciones').insert(impData);
  if (errImp) {
    await supabase.from('cobros').delete().eq('id', cobro.id);
    return { error: 'Error al imputar cobro: ' + errImp.message };
  }

  // 6) Actualizar monto_cobrado + estado de cada factura
  for (const imp of payload.imputaciones) {
    const f = facturas.find(x => x.id === imp.factura_id)!;
    const nuevoCobrado = Number(f.monto_cobrado) + Number(imp.importe);
    const total = Number(f.total);
    let nuevoEstado = f.estado;
    if (nuevoCobrado >= total - 0.01) nuevoEstado = 'cobrada';
    else if (nuevoCobrado > 0) nuevoEstado = 'parcial';

    await supabase
      .from('facturas')
      .update({ monto_cobrado: nuevoCobrado, estado: nuevoEstado })
      .eq('id', imp.factura_id);
  }

  // 7) Restar del saldo cta cte del cliente
  await supabase
    .from('clientes')
    .update({ saldo_cta_cte: Number(cli.saldo_cta_cte) - importeTotal })
    .eq('id', cli.id);

  revalidatePath('/admin/cobros');
  revalidatePath('/admin/facturas');
  revalidatePath('/admin/clientes');
  revalidatePath(`/admin/clientes/${cli.id}`);

  redirect(`/admin/cobros/${cobro.id}`);
}

export async function anularCobroAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cobro } = await supabase
    .from('cobros')
    .select('*, imputaciones:cobro_imputaciones(*)')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cobro) return { error: 'Cobro no encontrado' };
  if (cobro.anulado) return { error: 'Ya está anulado' };

  // 1) Revertir imputaciones en facturas
  for (const imp of cobro.imputaciones ?? []) {
    const { data: f } = await supabase
      .from('facturas')
      .select('total, monto_cobrado, estado')
      .eq('id', imp.factura_id)
      .single();
    if (f) {
      const nuevoCobrado = Math.max(0, Number(f.monto_cobrado) - Number(imp.importe));
      const total = Number(f.total);
      let nuevoEstado: string = f.estado;
      if (f.estado !== 'anulada' && f.estado !== 'borrador') {
        if (nuevoCobrado <= 0.01) nuevoEstado = 'emitida';
        else if (nuevoCobrado >= total - 0.01) nuevoEstado = 'cobrada';
        else nuevoEstado = 'parcial';
      }
      await supabase.from('facturas').update({ monto_cobrado: nuevoCobrado, estado: nuevoEstado }).eq('id', imp.factura_id);
    }
  }

  // 2) Anular cheque si lo había
  if (cobro.cheque_recibido_id) {
    await supabase
      .from('cheques_recibidos')
      .update({ estado: 'anulado' })
      .eq('id', cobro.cheque_recibido_id);
  }

  // 3) Devolver al saldo cta cte
  const { data: cli } = await supabase
    .from('clientes')
    .select('saldo_cta_cte')
    .eq('id', cobro.cliente_id)
    .single();
  if (cli) {
    await supabase
      .from('clientes')
      .update({ saldo_cta_cte: Number(cli.saldo_cta_cte) + Number(cobro.importe_total) })
      .eq('id', cobro.cliente_id);
  }

  // 4) Marcar anulado
  await supabase
    .from('cobros')
    .update({ anulado: true, anulado_en: new Date().toISOString(), anulado_por: user?.id ?? null })
    .eq('id', id);

  revalidatePath('/admin/cobros');
  revalidatePath(`/admin/cobros/${id}`);
  revalidatePath('/admin/facturas');
  revalidatePath('/admin/clientes');
  return { ok: true };
}
