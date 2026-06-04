import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ProveedorForm } from '../proveedor-form';

export const dynamic = 'force-dynamic';

export default async function NuevoProveedorPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');
  if (ctx.rol !== 'admin_productor') redirect('/admin/proveedores');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo proveedor"
        subtitle="Cargá los datos para empezar a registrar compras"
        icon="🚚"
        breadcrumbs={[
          { label: 'Proveedores', href: '/admin/proveedores' },
          { label: 'Nuevo' },
        ]}
      />
      <ProveedorForm />
    </div>
  );
}
