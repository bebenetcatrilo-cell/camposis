'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type FormaPago = 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'cuenta_corriente' | 'otro';
type EstadoCompra = 'pagada' | 'pendiente' | 'parcial' | 'anulada';

type ItemInput = {
  descripcion: string;
  unidad?: string | null;
  cantidad: number;
  precio_unitario: number;
  iva_porcentaje: number;
  // Stock
  suma_stock?: boolean;
  silo_id?: string | null;
  producto_id?: string | null;
  campania?: string | null;
};

export async function crearCompraAction(payload: {
  proveedor_id: string;
  numero_factura?: string | null;
  tipo_comprobante?: string | null;
  fecha: string;
  fecha_vencimiento?: string | null;
  forma_pago: FormaPago;
  estado: EstadoCompra;
  notas?: string | null;
  items: ItemInput[];
}) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins pueden crear compras' };

  if (!payload.proveedor_id) return { error: 'Falta el proveedor' };
  if (!payload.fecha) return { error: 'Falta la fecha' };
  if (!payload.items || payload.items.length === 0) return { error: 'Agregá al menos un ítem' };

  // Validaciones items
  for (const it of payload.items) {
    if (!it.descripcion?.trim()) return { error: 'Hay ítems sin descripción' };
    if (it.cantidad <= 0) return { error: `Cantidad inválida en "${it.descripcion}"` };
    if (it.precio_unitario < 0) return { error: `Precio inválido en "${it.descripcion}"` };
    if (it.suma_stock) {
      if (!it.silo_id) return { error: `"${it.descripcion}" tiene sumar stock activo pero falta seleccionar silo` };
      if (!it.producto_id) return { error: `"${it.descripcion}" tiene sumar stock activo pero falta seleccionar producto` };
    }
  }

  const supabase = await createClient();

  // Obtener datos del proveedor (snapshot)
  const { data: prov, error: errProv } = await supabase
    .from('proveedores')
    .select('id, nombre, cuit, saldo_cta_cte')
    .eq('id', payload.proveedor_id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (errProv || !prov) return { error: 'Proveedor no encontrado' };

  // Calcular totales
  let subtotal = 0;
  let iva_monto = 0;
  for (const it of payload.items) {
    const sub = it.cantidad * it.precio_unitario;
    const iva = sub * (it.iva_porcentaje / 100);
    subtotal += sub;
    iva_monto += iva;
  }
  const total = subtotal + iva_monto;

  // Monto pagado según estado
  let monto_pagado = 0;
  if (payload.estado === 'pagada') monto_pagado = total;
  else if (payload.estado === 'pendiente') monto_pagado = 0;
  // 'parcial' se carga después en pagos

  const { data: { user } } = await supabase.auth.getUser();

  // 1) Crear compra
  const { data: compra, error: errCompra } = await supabase
    .from('compras')
    .insert({
      productor_id: ctx.productor.id,
      proveedor_id: prov.id,
      numero_factura: payload.numero_factura || null,
      tipo_comprobante: payload.tipo_comprobante || null,
      fecha: payload.fecha,
      fecha_vencimiento: payload.fecha_vencimiento || null,
      proveedor_nombre: prov.nombre,
      proveedor_cuit: prov.cuit,
      subtotal,
      iva_monto,
      total,
      forma_pago: payload.forma_pago,
      estado: payload.estado,
      monto_pagado,
      notas: payload.notas || null,
      creado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (errCompra) return { error: errCompra.message };

  // 2) Insertar items
  const itemsData = payload.items.map((it, idx) => {
    const sub = it.cantidad * it.precio_unitario;
    const iva = sub * (it.iva_porcentaje / 100);
    return {
      compra_id: compra.id,
      descripcion: it.descripcion.trim(),
      unidad: it.unidad || null,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      iva_porcentaje: it.iva_porcentaje,
      subtotal: sub,
      iva_monto: iva,
      total: sub + iva,
      suma_stock: it.suma_stock ?? false,
      silo_id: it.suma_stock ? it.silo_id : null,
      producto_id: it.suma_stock ? it.producto_id : null,
      campania: it.suma_stock ? (it.campania || null) : null,
      orden: idx,
    };
  });

  const { data: itemsInsertados, error: errItems } = await supabase
    .from('items_compra')
    .insert(itemsData)
    .select('id, suma_stock, silo_id, producto_id, cantidad, campania');

  if (errItems) {
    // Rollback manual de la cabecera
    await supabase.from('compras').delete().eq('id', compra.id);
    return { error: 'Error al insertar items: ' + errItems.message };
  }

  // 3) Para los items que suman stock → crear movimientos_silo
  for (const it of itemsInsertados ?? []) {
    if (it.suma_stock && it.silo_id && it.producto_id) {
      const { data: mov, error: errMov } = await supabase
        .from('movimientos_silo')
        .insert({
          productor_id: ctx.productor.id,
          silo_id: it.silo_id,
          producto_id: it.producto_id,
          tipo: 'entrada',
          cantidad_tn: it.cantidad,
          campania: it.campania,
          fecha: payload.fecha,
          observaciones: `Compra a ${prov.nombre} - ${payload.numero_factura || 'sin nº'}`,
          registrado_por: user?.id ?? null,
        })
        .select('id')
        .single();

      if (!errMov && mov?.id) {
        await supabase
          .from('items_compra')
          .update({ movimiento_silo_id: mov.id })
          .eq('id', it.id);
      }
    }
  }

  // 4) Si NO está pagada → sumar al saldo cta cte del proveedor
  if (payload.estado === 'pendiente') {
    await supabase
      .from('proveedores')
      .update({ saldo_cta_cte: Number(prov.saldo_cta_cte) + total })
      .eq('id', prov.id);
  }

  revalidatePath('/admin/compras');
  revalidatePath('/admin/proveedores');
  revalidatePath(`/admin/proveedores/${prov.id}`);

  redirect(`/admin/compras/${compra.id}`);
}

export async function anularCompraAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();

  // Cargar compra completa con items
  const { data: compra } = await supabase
    .from('compras')
    .select('*, items_compra(*)')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!compra) return { error: 'Compra no encontrada' };
  if (compra.estado === 'anulada') return { error: 'Ya está anulada' };

  // 1) Revertir movimientos de silo
  for (const it of compra.items_compra ?? []) {
    if (it.movimiento_silo_id) {
      await supabase
        .from('movimientos_silo')
        .delete()
        .eq('id', it.movimiento_silo_id);
    }
  }

  // 2) Restar del saldo cta cte si estaba pendiente
  if (compra.estado === 'pendiente' || compra.estado === 'parcial') {
    const { data: prov } = await supabase
      .from('proveedores')
      .select('saldo_cta_cte')
      .eq('id', compra.proveedor_id)
      .single();

    if (prov) {
      const pendiente = Number(compra.total) - Number(compra.monto_pagado);
      await supabase
        .from('proveedores')
        .update({ saldo_cta_cte: Number(prov.saldo_cta_cte) - pendiente })
        .eq('id', compra.proveedor_id);
    }
  }

  // 3) Marcar como anulada
  const { error } = await supabase
    .from('compras')
    .update({ estado: 'anulada' })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/compras');
  revalidatePath(`/admin/compras/${id}`);
  revalidatePath(`/admin/proveedores/${compra.proveedor_id}`);
  return { ok: true };
}
