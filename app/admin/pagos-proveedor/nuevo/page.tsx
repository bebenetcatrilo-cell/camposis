import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { PagoForm } from './pago-form';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ proveedor_id?: string }>;

export default async function NuevoPagoProveedorPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');
  if (ctx.rol !== 'admin_productor') redirect('/admin/pagos-proveedor');

  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: proveedores }, { data: chequesRecibidos }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre, cuit, saldo_cta_cte')
      .eq('productor_id', ctx.productor.id).eq('activo', true)
      .gt('saldo_cta_cte', 0).order('nombre'),
    supabase.from('cheques_recibidos').select('id, numero, banco, importe, fecha_pago, librador')
      .eq('productor_id', ctx.productor.id).eq('estado', 'cartera').order('fecha_pago'),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo pago a proveedor"
        icon="💸"
        breadcrumbs={[
          { label: 'Pagos a proveedores', href: '/admin/pagos-proveedor' },
          { label: 'Nuevo' },
        ]}
      />
      <PagoForm
        proveedores={proveedores ?? []}
        chequesRecibidos={chequesRecibidos ?? []}
        proveedorIdPreseleccionado={params.proveedor_id ?? null}
      />
    </div>
  );
}
