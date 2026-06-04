import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';

export async function GET() {
  const ctx = await getProductorActivo();
  if (!ctx) return NextResponse.json({ clientes: [], facturas: [] });

  const supabase = await createClient();

  const [clientesRes, facturasRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre')
      .eq('productor_id', ctx.productor.id)
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('facturas')
      .select('id, tipo, punto_venta, numero, cliente_id')
      .eq('productor_id', ctx.productor.id)
      .eq('estado', 'emitida')
      .order('fecha', { ascending: false }),
  ]);

  return NextResponse.json({
    clientes: clientesRes.data ?? [],
    facturas: facturasRes.data ?? [],
  });
}
