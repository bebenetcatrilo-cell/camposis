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

  const importeTotal = payload.imputaciones.reduce((s, i) => s + Number(i.importe), 0);
  if (importeTotal <= 0) return { error: 'El importe total debe ser mayor a 0' };

  const supabase = await createClient();

  // 1) Validar proveedor
  const { data: prov } = await supabase
    .from('proveedores')
    .select('id, nombre, saldo_cta_cte')
    .eq('id', payload.proveedor_id)
    .eq('productor_id', ctx.productor.id)
    .single();
  if (!prov) return { error: 'Proveedor no encontrado' };

  // 2) Validar compras y montos
  const compraIds = payload.imputaciones.map(i => i.compra_id);
  const { data: compras } = await supabase
    .from('compras')
    .select('id, total, monto_pagado, estado, proveedor_id')
    .in('id', compraIds)
    .eq('productor_id', ctx.productor.id);

  if (!compras || compras.length !== compraIds.length)
    return { error: 'Alguna compra no se encontró' };

  for (const imp of payload.imputaciones) {
    const c = compras.find(x => x.id === imp.compra_id);
    if (!c) return { error: 'Compra no encontrada' };
    if (c.proveedor_id !== payload.proveedor_id) return { error: 'Hay compras de otro proveedor mezcladas' };
    if (c.estado === 'anulada') return { error: 'No podés pagar una compra anulada' };
    const pendiente = Number(c.total) - Number(c.monto_pagado);
    if (Number(imp.importe) > pendiente + 0.01) {
      return { error: `El importe imputado a una compra ($${imp.importe}) supera el pendiente ($${pendiente.toFixed(2)})` };
    }
  }

  // 3) Validar forma de pago específica
  let chequeEmitidoId: string | null = null;
  let chequeRecibidoIdFinal: string | null = null;

  const { data: { user } } = await supabase.auth.getUser();

  if (payload.forma_pago === 'cheque_propio') {
    if (!payload.cheque_propio) return { error: 'Faltan datos del cheque propio' };
    const cp = payload.cheque_propio;
    if (!cp.numero || !cp.banco_propio || !cp.fecha_emision || !cp.fecha_pago || cp.importe <= 0)
      return { error: 'Datos del cheque propio incompletos' };
    if (Math.abs(cp.importe - importeTotal) > 0.01)
      return { error: `Importe del cheque ($${cp.importe}) debe igualar al pago total ($${importeTotal.toFixed(2)})` };

    // Crear cheque emitido
    const { data: cheque, error: errCh } = await supabase
      .from('cheques_emitidos')
      .insert({
        productor_id: ctx.productor.id,
        numero: cp.numero,
        banco_propio: cp.banco_propio,
        fecha_emision: cp.fecha_emision,
        fecha_pago: cp.fecha_pago,
        importe: cp.importe,
        beneficiario: prov.nombre,
        concepto: `Pago a ${prov.nombre}`,
        estado: 'entregado',
        fecha_entrega: payload.fecha,
        entregado_a: prov.nombre,
        registrado_por: user?.id ?? null,
      })
      .select('id')
      .single();
    if (errCh || !cheque) return { error: 'Error al crear cheque emitido: ' + (errCh?.message ?? '') };
    chequeEmitidoId = cheque.id;
  }

  if (payload.forma_pago === 'cheque_endoso') {
    if (!payload.cheque_recibido_id) return { error: 'Falta seleccionar el cheque recibido a endosar' };
    const { data: chR } = await supabase
      .from('cheques_recibidos')
      .select('id, importe, estado')
      .eq('id', payload.cheque_recibido_id)
      .eq('productor_id', ctx.productor.id)
      .single();
    if (!chR) return { error: 'Cheque recibido no encontrado' };
    if (chR.estado !== 'cartera') return { error: 'El cheque no está en cartera (no se puede endosar)' };
    if (Math.abs(Number(chR.importe) - importeTotal) > 0.01)
      return { error: `Importe del cheque ($${chR.importe}) debe igualar al pago total ($${importeTotal.toFixed(2)})` };

    // Marcar cheque como endosado
    await supabase
      .from('cheques_recibidos')
      .update({
        estado: 'endosado',
        endosado_a: prov.nombre,
        fecha_endoso: payload.fecha,
      })
      .eq('id', chR.id);

    chequeRecibidoIdFinal = chR.id;
  }

  // 4) Crear el pago
  const { data: numData } = await supabase.rpc('siguiente_numero_pago_proveedor', { p_productor_id: ctx.productor.id });
  const numero = (numData as number) ?? 1;

  const { data: pago, error: errPago } = await supabase
    .from('pagos_proveedor')
    .insert({
      productor_id: ctx.productor.id,
      proveedor_id: prov.id,
      numero,
      fecha: payload.fecha,
      proveedor_nombre: prov.nombre,
      importe_total: importeTotal,
      forma_pago: payload.forma_pago,
      cheque_emitido_id: chequeEmitidoId,
      cheque_recibido_id: chequeRecibidoIdFinal,
      notas: payload.notas?.trim() || null,
      registrado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (errPago) return { error: errPago.message };

  // 5) Crear imputaciones
  const impData = payload.imputaciones.map(i => ({
    pago_id: pago.id,
    compra_id: i.compra_id,
    importe: Number(i.importe),
  }));

  const { error: errImp } = await supabase.from('pago_proveedor_imputaciones').insert(impData);
  if (errImp) {
    await supabase.from('pagos_proveedor').delete().eq('id', pago.id);
    return { error: 'Error al imputar pago: ' + errImp.message };
  }

  // 6) Actualizar monto_pagado y estado de cada compra
  for (const imp of payload.imputaciones) {
    const c = compras.find(x => x.id === imp.compra_id)!;
    const nuevoPagado = Number(c.monto_pagado) + Number(imp.importe);
    const total = Number(c.total);
    let nuevoEstado = c.estado;
    if (nuevoPagado >= total - 0.01) nuevoEstado = 'pagada';
    else if (nuevoPagado > 0) nuevoEstado = 'parcial';

    await supabase
      .from('compras')
      .update({ monto_pagado: nuevoPagado, estado: nuevoEstado })
      .eq('id', imp.compra_id);
  }

  // 7) Restar del saldo cta cte del proveedor
  await supabase
    .from('proveedores')
    .update({ saldo_cta_cte: Number(prov.saldo_cta_cte) - importeTotal })
    .eq('id', prov.id);

  revalidatePath('/admin/pagos-proveedor');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/proveedores');
  revalidatePath(`/admin/proveedores/${prov.id}`);

  redirect(`/admin/pagos-proveedor/${pago.id}`);
}

export async function anularPagoProveedorAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: pago } = await supabase
    .from('pagos_proveedor')
    .select('*, imputaciones:pago_proveedor_imputaciones(*)')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!pago) return { error: 'Pago no encontrado' };
  if (pago.anulado) return { error: 'Ya está anulado' };

  // 1) Revertir las imputaciones en las compras
  for (const imp of pago.imputaciones ?? []) {
    const { data: c } = await supabase
      .from('compras')
      .select('total, monto_pagado, estado')
      .eq('id', imp.compra_id)
      .single();
    if (c) {
      const nuevoPagado = Math.max(0, Number(c.monto_pagado) - Number(imp.importe));
      const total = Number(c.total);
      let nuevoEstado: string = c.estado;
      if (c.estado !== 'anulada') {
        if (nuevoPagado <= 0.01) nuevoEstado = 'pendiente';
        else if (nuevoPagado >= total - 0.01) nuevoEstado = 'pagada';
        else nuevoEstado = 'parcial';
      }
      await supabase.from('compras').update({ monto_pagado: nuevoPagado, estado: nuevoEstado }).eq('id', imp.compra_id);
    }
  }

  // 2) Anular cheque emitido si lo había
  if (pago.cheque_emitido_id) {
    await supabase
      .from('cheques_emitidos')
      .update({ estado: 'anulado' })
      .eq('id', pago.cheque_emitido_id);
  }

  // 3) Devolver cheque endosado a cartera
  if (pago.cheque_recibido_id) {
    await supabase
      .from('cheques_recibidos')
      .update({ estado: 'cartera', endosado_a: null, fecha_endoso: null })
      .eq('id', pago.cheque_recibido_id);
  }

  // 4) Sumar de nuevo al saldo cta cte
  const { data: prov } = await supabase
    .from('proveedores')
    .select('saldo_cta_cte')
    .eq('id', pago.proveedor_id)
    .single();
  if (prov) {
    await supabase
      .from('proveedores')
      .update({ saldo_cta_cte: Number(prov.saldo_cta_cte) + Number(pago.importe_total) })
      .eq('id', pago.proveedor_id);
  }

  // 5) Marcar pago como anulado
  await supabase
    .from('pagos_proveedor')
    .update({ anulado: true, anulado_en: new Date().toISOString(), anulado_por: user?.id ?? null })
    .eq('id', id);

  revalidatePath('/admin/pagos-proveedor');
  revalidatePath(`/admin/pagos-proveedor/${id}`);
  revalidatePath('/admin/compras');
  revalidatePath('/admin/proveedores');
  return { ok: true };
}
