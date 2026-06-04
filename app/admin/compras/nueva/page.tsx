import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { CompraForm } from './compra-form';

export const dynamic = 'force-dynamic';

export default async function NuevaCompraPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');
  if (ctx.rol !== 'admin_productor') redirect('/admin/compras');

  const supabase = await createClient();

  const [{ data: proveedores }, { data: silos }, { data: productos }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre, cuit, plazo_pago_dias')
      .eq('productor_id', ctx.productor.id).eq('activo', true).order('nombre'),
    supabase.from('silos').select('id, nombre')
      .eq('productor_id', ctx.productor.id).eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre')
      .eq('productor_id', ctx.productor.id).eq('activo', true).order('nombre'),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nueva compra"
        icon="🛒"
        breadcrumbs={[
          { label: 'Compras', href: '/admin/compras' },
          { label: 'Nueva' },
        ]}
      />
      <CompraForm
        proveedores={proveedores ?? []}
        silos={silos ?? []}
        productos={productos ?? []}
      />
    </div>
  );
}
