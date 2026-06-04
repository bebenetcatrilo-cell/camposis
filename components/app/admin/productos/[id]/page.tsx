import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { EditarProductoForm } from './form';

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: producto } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!producto) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href={`/admin/productos?tipo=${producto.tipo}`}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a productos
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {producto.tipo === 'cereal' ? '🌾' : '🐄'} {producto.nombre}
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Editá los datos del producto.
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <EditarProductoForm producto={producto} />
      </div>
    </div>
  );
}
