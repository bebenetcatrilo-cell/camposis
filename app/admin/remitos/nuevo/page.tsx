import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { RemitoForm } from './remito-form';

export const dynamic = 'force-dynamic';

export default async function NuevoRemitoPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');
  if (ctx.rol !== 'admin_productor') redirect('/admin/remitos');

  const supabase = await createClient();

  const [{ data: clientes }, { data: productos }] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre')
      .eq('productor_id', ctx.productor.id)
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('productos')
      .select('id, nombre, unidad')
      .eq('productor_id', ctx.productor.id)
      .order('nombre'),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo remito"
        icon="📦"
        breadcrumbs={[
          { label: 'Remitos', href: '/admin/remitos' },
          { label: 'Nuevo' },
        ]}
      />
      <RemitoForm clientes={clientes ?? []} productos={productos ?? []} />
    </div>
  );
}
