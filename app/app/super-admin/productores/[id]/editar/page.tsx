import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EditarProductorForm } from './form';

export default async function EditarProductorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: productor, error } = await supabase
    .from('productores')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !productor) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href={`/super-admin/productores/${id}`}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver al productor
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          ✏️ Editar productor
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">{productor.nombre}</p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <EditarProductorForm productor={productor} />
      </div>
    </div>
  );
}
