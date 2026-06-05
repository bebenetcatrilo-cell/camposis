'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type TipoMov = 'compra' | 'venta' | 'paricion' | 'muerte' | 'consumo' | 'traslado' | 'recategorizacion';

// ═══════════════════════════════════════════════════════════
// CATEGORÍAS
// ═══════════════════════════════════════════════════════════
export async function crearCategoriaHaciendaAction(formData: FormData) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) return { error: 'Falta el nombre' };
  const sexo = String(formData.get('sexo') ?? '').trim() || null;
  const color = String(formData.get('color') ?? '#888888').trim();

  const supabase = await createClient();
  const { error } = await supabase.from('categorias_hacienda').insert({
    productor_id: ctx.productor.id,
    nombre,
    sexo: sexo === 'macho' || sexo === 'hembra' ? sexo : null,
    color,
  });
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una categoría con ese nombre' };
    return { error: error.message };
  }
  revalidatePath('/admin/hacienda');
  return { ok: true };
}

export async function eliminarCategoriaHaciendaAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();
  // Solo marcar inactiva para no romper movimientos históricos
  const { error } = await supabase
    .from('categorias_hacienda')
    .update({ activo: false })
    .eq('id', id)
    .eq('productor_id', ctx.productor.id);
  if (error) return { error: error.message };
  revalidatePath('/admin/hacienda');
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════
// RODEOS
// ═══════════════════════════════════════════════════════════
export async function crearRodeoAction(formData: FormData) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) return { error: 'Falta el nombre' };
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null;
  const ubicacion = String(formData.get('ubicacion') ?? '').trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from('rodeos').insert({
    productor_id: ctx.productor.id,
    nombre,
    descripcion,
    ubicacion,
  });
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un rodeo con ese nombre' };
    return { error: error.message };
  }
  revalidatePath('/admin/hacienda/rodeos');
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════
// HELPER: aplicar cambio de stock
// ═══════════════════════════════════════════════════════════
async function aplicarStock(supabase: any, productorId: string, categoriaId: string, rodeoId: string | null, deltaCantidad: number, deltaPesoKg: number) {
  // Upsert: si no existe, crear; si existe, sumar
  const { data: existente } = await supabase
    .from('stock_hacienda')
    .select('id, cantidad, peso_total_kg')
    .eq('productor_id', productorId)
    .eq('categoria_id', categoriaId)
    .is('rodeo_id', rodeoId ?? null)
    .maybeSingle();

  if (existente) {
    const nuevaCant = (existente.cantidad ?? 0) + deltaCantidad;
    const nuevoPeso = (Number(existente.peso_total_kg) || 0) + deltaPesoKg;
    await supabase
      .from('stock_hacienda')
      .update({
        cantidad: Math.max(0, nuevaCant),
        peso_total_kg: Math.max(0, nuevoPeso),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existente.id);
  } else if (deltaCantidad > 0) {
    await supabase.from('stock_hacienda').insert({
      productor_id: productorId,
      categoria_id: categoriaId,
      rodeo_id: rodeoId,
      cantidad: deltaCantidad,
      peso_total_kg: Math.max(0, deltaPesoKg),
    });
  }
}

// ═══════════════════════════════════════════════════════════
// MOVIMIENTOS
// ═══════════════════════════════════════════════════════════
export async function crearMovimientoHaciendaAction(payload: {
  tipo: TipoMov;
  fecha: string;
  categoria_id: string;
  categoria_destino_id?: string | null;
  rodeo_id?: string | null;
  rodeo_destino_id?: string | null;
  cantidad: number;
  peso_promedio_kg?: number | null;
  precio_por_kg?: number | null;
  precio_por_cabeza?: number | null;
  proveedor_id?: string | null;
  cliente_id?: string | null;
  motivo?: string | null;
  observaciones?: string | null;
}) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  if (!payload.tipo) return { error: 'Falta el tipo' };
  if (!payload.fecha) return { error: 'Falta la fecha' };
  if (!payload.categoria_id) return { error: 'Falta la categoría' };
  if (!payload.cantidad || payload.cantidad <= 0) return { error: 'Cantidad inválida' };

  // Validaciones específicas según tipo
  if (payload.tipo === 'traslado' && !payload.rodeo_destino_id) {
    return { error: 'En traslado tenés que indicar rodeo destino' };
  }
  if (payload.tipo === 'recategorizacion' && !payload.categoria_destino_id) {
    return { error: 'En recategorización tenés que indicar categoría destino' };
  }
  if (payload.tipo === 'compra' && !payload.proveedor_id) {
    return { error: 'En compras tenés que indicar el proveedor' };
  }
  if (payload.tipo === 'venta' && !payload.cliente_id) {
    return { error: 'En ventas tenés que indicar el cliente' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Calcular peso total
  const pesoTotal = (payload.peso_promedio_kg ?? 0) * payload.cantidad;

  // Calcular importe total (solo compra/venta)
  let importeTotal: number | null = null;
  if (payload.tipo === 'compra' || payload.tipo === 'venta') {
    if (payload.precio_por_kg && pesoTotal > 0) {
      importeTotal = payload.precio_por_kg * pesoTotal;
    } else if (payload.precio_por_cabeza) {
      importeTotal = payload.precio_por_cabeza * payload.cantidad;
    }
  }

  // Obtener snapshots de contraparte
  let provNombre: string | null = null;
  let cliNombre: string | null = null;
  if (payload.proveedor_id) {
    const { data } = await supabase.from('proveedores').select('nombre').eq('id', payload.proveedor_id).single();
    provNombre = data?.nombre ?? null;
  }
  if (payload.cliente_id) {
    const { data } = await supabase.from('clientes').select('nombre').eq('id', payload.cliente_id).single();
    cliNombre = data?.nombre ?? null;
  }

  // ── Validar stock disponible para salidas ──
  const ESTOC = ['venta', 'muerte', 'consumo', 'traslado', 'recategorizacion'];
  if (ESTOC.includes(payload.tipo)) {
    const { data: stock } = await supabase
      .from('stock_hacienda')
      .select('cantidad')
      .eq('productor_id', ctx.productor.id)
      .eq('categoria_id', payload.categoria_id)
      .is('rodeo_id', payload.rodeo_id ?? null)
      .maybeSingle();
    const disponible = stock?.cantidad ?? 0;
    if (disponible < payload.cantidad) {
      return { error: `Stock insuficiente. Disponible: ${disponible} cabezas` };
    }
  }

  // ── Crear el movimiento ──
  const { data: mov, error } = await supabase
    .from('movimientos_hacienda')
    .insert({
      productor_id: ctx.productor.id,
      tipo: payload.tipo,
      fecha: payload.fecha,
      categoria_id: payload.categoria_id,
      categoria_destino_id: payload.categoria_destino_id ?? null,
      rodeo_id: payload.rodeo_id ?? null,
      rodeo_destino_id: payload.rodeo_destino_id ?? null,
      cantidad: payload.cantidad,
      peso_promedio_kg: payload.peso_promedio_kg ?? null,
      peso_total_kg: pesoTotal > 0 ? pesoTotal : null,
      precio_por_kg: payload.precio_por_kg ?? null,
      precio_por_cabeza: payload.precio_por_cabeza ?? null,
      importe_total: importeTotal,
      proveedor_id: payload.proveedor_id ?? null,
      proveedor_nombre: provNombre,
      cliente_id: payload.cliente_id ?? null,
      cliente_nombre: cliNombre,
      motivo: payload.motivo ?? null,
      observaciones: payload.observaciones ?? null,
      registrado_por: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // ── Actualizar stock según tipo ──
  // ENTRADAS: compra, paricion → sumar
  // SALIDAS: venta, muerte, consumo → restar
  // TRASLADO: restar de origen, sumar en destino (misma categoría)
  // RECATEGORIZACIÓN: restar de categoría origen, sumar en categoría destino

  if (payload.tipo === 'compra' || payload.tipo === 'paricion') {
    await aplicarStock(supabase, ctx.productor.id, payload.categoria_id, payload.rodeo_id ?? null, payload.cantidad, pesoTotal);
  } else if (payload.tipo === 'venta' || payload.tipo === 'muerte' || payload.tipo === 'consumo') {
    await aplicarStock(supabase, ctx.productor.id, payload.categoria_id, payload.rodeo_id ?? null, -payload.cantidad, -pesoTotal);
  } else if (payload.tipo === 'traslado') {
    // Restar de origen
    await aplicarStock(supabase, ctx.productor.id, payload.categoria_id, payload.rodeo_id ?? null, -payload.cantidad, -pesoTotal);
    // Sumar en destino
    await aplicarStock(supabase, ctx.productor.id, payload.categoria_id, payload.rodeo_destino_id ?? null, payload.cantidad, pesoTotal);
  } else if (payload.tipo === 'recategorizacion') {
    // Restar de categoría origen
    await aplicarStock(supabase, ctx.productor.id, payload.categoria_id, payload.rodeo_id ?? null, -payload.cantidad, -pesoTotal);
    // Sumar en categoría destino
    await aplicarStock(supabase, ctx.productor.id, payload.categoria_destino_id!, payload.rodeo_id ?? null, payload.cantidad, pesoTotal);
  }

  revalidatePath('/admin/hacienda');
  revalidatePath('/admin/hacienda/movimientos');
  redirect(`/admin/hacienda/movimientos/${mov.id}`);
}

export async function anularMovimientoHaciendaAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: mov } = await supabase
    .from('movimientos_hacienda')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!mov) return { error: 'Movimiento no encontrado' };
  if (mov.anulado) return { error: 'Ya está anulado' };

  // Revertir el stock (inverso de lo que hizo el movimiento)
  const pesoTotal = Number(mov.peso_total_kg) || 0;
  const cant = Number(mov.cantidad);

  if (mov.tipo === 'compra' || mov.tipo === 'paricion') {
    await aplicarStock(supabase, ctx.productor.id, mov.categoria_id, mov.rodeo_id, -cant, -pesoTotal);
  } else if (mov.tipo === 'venta' || mov.tipo === 'muerte' || mov.tipo === 'consumo') {
    await aplicarStock(supabase, ctx.productor.id, mov.categoria_id, mov.rodeo_id, cant, pesoTotal);
  } else if (mov.tipo === 'traslado') {
    await aplicarStock(supabase, ctx.productor.id, mov.categoria_id, mov.rodeo_id, cant, pesoTotal);
    await aplicarStock(supabase, ctx.productor.id, mov.categoria_id, mov.rodeo_destino_id, -cant, -pesoTotal);
  } else if (mov.tipo === 'recategorizacion') {
    await aplicarStock(supabase, ctx.productor.id, mov.categoria_id, mov.rodeo_id, cant, pesoTotal);
    await aplicarStock(supabase, ctx.productor.id, mov.categoria_destino_id, mov.rodeo_id, -cant, -pesoTotal);
  }

  await supabase
    .from('movimientos_hacienda')
    .update({ anulado: true, anulado_en: new Date().toISOString(), anulado_por: user?.id ?? null })
    .eq('id', id);

  revalidatePath('/admin/hacienda');
  revalidatePath(`/admin/hacienda/movimientos/${id}`);
  return { ok: true };
}
