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
  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, tipo, punto_venta, numero, fecha, total, monto_cobrado, estado')
    .eq('productor_id', ctx.productor.id)
    .eq('cliente_id', id)
    .in('estado', ['emitida', 'parcial'])
    .order('fecha');

  const result = (facturas ?? []).map(f => ({
    id: f.id,
    numero_completo: `${f.tipo} ${f.punto_venta}-${String(f.numero).padStart(8, '0')}`,
    fecha: f.fecha,
    total: Number(f.total),
    monto_cobrado: Number(f.monto_cobrado),
    pendiente: Number(f.total) - Number(f.monto_cobrado),
  }));

  return NextResponse.json({ facturas: result });
}
