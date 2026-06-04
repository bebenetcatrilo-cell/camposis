import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import { Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ProveedorForm } from '../../proveedor-form';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function EditarProveedorPage({ params }: { params: Params }) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');
  if (ctx.rol !== 'admin_productor') redirect(`/admin/proveedores/${id}`);

  const supabase = await createClient();
  const { data: prov } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!prov) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Editar: ${prov.nombre}`}
        icon="🚚"
        breadcrumbs={[
          { label: 'Proveedores', href: '/admin/proveedores' },
          { label: prov.nombre, href: `/admin/proveedores/${id}` },
          { label: 'Editar' },
        ]}
      />
      <ProveedorForm proveedor={prov} />
    </div>
  );
}
