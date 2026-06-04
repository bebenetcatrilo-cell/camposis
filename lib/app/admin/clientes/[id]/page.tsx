import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ClienteForm } from '../cliente-form';

const TIPOS_LABEL: Record<string, { label: string; icon: string }> = {
  acopio: { label: 'Acopio', icon: '🌾' },
  frigorifico: { label: 'Frigorífico', icon: '🐄' },
  proveedor: { label: 'Proveedor', icon: '🚜' },
  particular: { label: 'Particular', icon: '👤' },
  otro: { label: 'Otro', icon: '📋' },
};

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cliente) notFound();

  const tipo = TIPOS_LABEL[cliente.tipo] ?? TIPOS_LABEL.otro;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/admin/clientes"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a clientes
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {tipo.icon} {cliente.nombre}
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Editá los datos del cliente.
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <ClienteForm cliente={cliente} />
      </div>
    </div>
  );
}
