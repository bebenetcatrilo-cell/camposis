import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { MovimientoForm } from './form';

export default async function NuevoMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: silo } = await supabase
    .from('silos')
    .select('id, nombre, tipo')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!silo) notFound();

  // Traer productos activos para el dropdown (cereal + hacienda)
  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, tipo, unidad')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true)
    .order('tipo')
    .order('nombre');

  // Stock actual para validar salidas
  const { data: stock } = await supabase
    .from('stock_silos')
    .select('producto_id, campania, stock_actual_tn')
    .eq('silo_id', id)
    .eq('productor_id', ctx.productor.id);

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href={`/admin/silos/${id}`}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver al silo
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          📝 Registrar movimiento
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          En silo: <strong>{silo.nombre}</strong>
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <MovimientoForm
          siloId={silo.id}
          productos={productos ?? []}
          stock={stock ?? []}
        />
      </div>
    </div>
  );
}
