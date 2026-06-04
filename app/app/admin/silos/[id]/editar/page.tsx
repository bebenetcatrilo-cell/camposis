import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { SiloForm } from '../../silo-form';

export default async function EditarSiloPage({
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
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!silo) notFound();

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
          ✏️ Editar silo
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">{silo.nombre}</p>
      </header>
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <SiloForm silo={silo} />
      </div>
    </div>
  );
}
