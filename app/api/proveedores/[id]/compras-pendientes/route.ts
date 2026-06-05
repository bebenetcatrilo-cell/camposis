import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = await createClient();
  const { data: compras } = await supabase
    .from('compras')
    .select('id, numero_factura, fecha, total, monto_pagado, estado')
    .eq('productor_id', ctx.productor.id)
    .eq('proveedor_id', id)
    .in('estado', ['pendiente', 'parcial'])
    .order('fecha');

  const result = (compras ?? []).map(c => ({
    id: c.id,
    numero_factura: c.numero_factura,
    fecha: c.fecha,
    total: Number(c.total),
    monto_pagado: Number(c.monto_pagado),
    pendiente: Number(c.total) - Number(c.monto_pagado),
  }));

  return NextResponse.json({ compras: result });
}
