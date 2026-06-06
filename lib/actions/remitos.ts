'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type ItemRemito = {
  producto_id?: string | null;
  descripcion: string;
  unidad?: string | null;
  cantidad: number;
};

// ─────────────────────────────────────────────────────────────
// Crear remito a mano (cliente + ítems sueltos, sin factura)
// ─────────────────────────────────────────────────────────────
export async function crearRemitoAction(payload: {
  cliente_id: string;
  fecha: string;
  transporte?: string | null;
  observaciones?: string | null;
  items: ItemRemito[];
}) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  if (!payload.cliente_id) return { error: 'Seleccioná un cliente' };
  if (!payload.fecha) return { error: 'Falta la fecha' };

  const items = (payload.items ?? []).filter(
    (it) => it.descripcion?.trim() && Number(it.cantidad) > 0
  );
  if (items.length === 0) return { error: 'Agregá al menos un ítem con cantidad' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Snapshot del cliente
  const { data: cli } = await supabase
    .from('clientes')
    .select('id, nombre, cuit, direccion, localidad')
    .eq('id', payload.cliente_id)
    .eq('productor_id', ctx.productor.id)
    .single();
  if (!cli) return { error: 'Cliente no encontrado' };

  const punto_venta = ctx.productor.punto_venta || '0001';
  const { data: numData } = await supabase.rpc('siguiente_numero_remito', {
    p_productor_id: ctx.productor.id,
    p_punto_venta: punto_venta,
  });
  const numero = (numData as number) ?? 1;

  const { data: remito, error } = await supabase
    .from('remitos')
    .insert({
      productor_id: ctx.productor.id,
      punto_venta,
      numero,
      fecha: payload.fecha,
      cliente_id: cli.id,
      cliente_nombre: cli.nombre,
      cliente_cuit: cli.cuit,
      cliente_direccion: cli.direccion,
      cliente_localidad: cli.localidad,
      transporte: payload.transporte?.trim() || null,
      observaciones: payload.observaciones?.trim() || null,
      estado: 'borrador',
      creado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  const itemsData = items.map((it, idx) => ({
    remito_id: remito.id,
    producto_id: it.producto_id || null,
    descripcion: it.descripcion.trim(),
    unidad: it.unidad?.trim() || null,
    cantidad: Number(it.cantidad),
    orden: idx,
  }));
  const { error: errItems } = await supabase.from('items_remito').insert(itemsData);
  if (errItems) {
    await supabase.from('remitos').delete().eq('id', remito.id);
    return { error: 'Error al cargar ítems: ' + errItems.message };
  }

  revalidatePath('/admin/remitos');
  redirect(`/admin/remitos/${remito.id}`);
}

// ─────────────────────────────────────────────────────────────
// Generar remito desde una factura (snapshot cliente + ítems sin precio)
// ─────────────────────────────────────────────────────────────
export async function generarRemitoDeFacturaAction(facturaId: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: fact } = await supabase
    .from('facturas')
    .select('*, items:items_factura(*)')
    .eq('id', facturaId)
    .eq('productor_id', ctx.productor.id)
    .single();
  if (!fact) return { error: 'Factura no encontrada' };
  if (fact.estado === 'borrador')
    return { error: 'Emití la factura antes de generar su remito' };

  const punto_venta = ctx.productor.punto_venta || '0001';
  const { data: numData } = await supabase.rpc('siguiente_numero_remito', {
    p_productor_id: ctx.productor.id,
    p_punto_venta: punto_venta,
  });
  const numero = (numData as number) ?? 1;

  const facNumFmt = `${fact.punto_venta}-${String(fact.numero).padStart(8, '0')}`;

  const { data: remito, error } = await supabase
    .from('remitos')
    .insert({
      productor_id: ctx.productor.id,
      punto_venta,
      numero,
      fecha: new Date().toISOString().slice(0, 10),
      cliente_id: fact.cliente_id,
      cliente_nombre: fact.cliente_nombre,
      cliente_cuit: fact.cliente_cuit,
      cliente_direccion: fact.cliente_direccion,
      cliente_localidad: fact.cliente_localidad,
      factura_id: fact.id,
      observaciones: `Generado desde Factura ${fact.tipo} ${facNumFmt}`,
      estado: 'borrador',
      creado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Copiar ítems SIN precio
  if (fact.items && fact.items.length > 0) {
    const items = fact.items
      .sort((a: { orden?: number }, b: { orden?: number }) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((it: { descripcion: string; unidad: string | null; cantidad: number; producto_id?: string | null; orden?: number }, idx: number) => ({
        remito_id: remito.id,
        producto_id: it.producto_id || null,
        descripcion: it.descripcion,
        unidad: it.unidad,
        cantidad: it.cantidad,
        orden: it.orden ?? idx,
      }));
    const { error: errItems } = await supabase.from('items_remito').insert(items);
    if (errItems) {
      await supabase.from('remitos').delete().eq('id', remito.id);
      return { error: 'Error al copiar ítems: ' + errItems.message };
    }
  }

  revalidatePath('/admin/remitos');
  revalidatePath(`/admin/facturas/${facturaId}`);
  redirect(`/admin/remitos/${remito.id}`);
}

// ─────────────────────────────────────────────────────────────
// Cambiar estado (emitir / anular)
// ─────────────────────────────────────────────────────────────
export async function cambiarEstadoRemitoAction(
  id: string,
  nuevoEstado: 'emitido' | 'anulado'
) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();

  const { data: remito } = await supabase
    .from('remitos')
    .select('id, estado')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();
  if (!remito) return { error: 'Remito no encontrado' };
  if (remito.estado === 'anulado') return { error: 'El remito ya está anulado' };

  const { error } = await supabase
    .from('remitos')
    .update({ estado: nuevoEstado })
    .eq('id', id)
    .eq('productor_id', ctx.productor.id);
  if (error) return { error: error.message };

  revalidatePath('/admin/remitos');
  revalidatePath(`/admin/remitos/${id}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Eliminar (solo borrador)
// ─────────────────────────────────────────────────────────────
export async function eliminarRemitoAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();

  const { data: remito } = await supabase
    .from('remitos')
    .select('id, estado')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();
  if (!remito) return { error: 'Remito no encontrado' };
  if (remito.estado !== 'borrador')
    return { error: 'Solo se pueden eliminar remitos en borrador. Anulalo en su lugar.' };

  const { error } = await supabase.from('remitos').delete().eq('id', id).eq('productor_id', ctx.productor.id);
  if (error) return { error: error.message };

  revalidatePath('/admin/remitos');
  redirect('/admin/remitos');
}
