import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { CobroForm } from './cobro-form';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ cliente_id?: string }>;

export default async function NuevoCobroPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');
  if (ctx.rol !== 'admin_productor') redirect('/admin/cobros');

  const params = await searchParams;
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre, cuit, saldo_cta_cte')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true)
    .gt('saldo_cta_cte', 0)
    .order('nombre');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo cobro"
        icon="💰"
        breadcrumbs={[
          { label: 'Cobros', href: '/admin/cobros' },
          { label: 'Nuevo' },
        ]}
      />
      <CobroForm
        clientes={clientes ?? []}
        clienteIdPreseleccionado={params.cliente_id ?? null}
      />
    </div>
  );
}
