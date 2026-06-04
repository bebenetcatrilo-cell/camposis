import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { FacturaForm } from '../factura-form';
import { PageHeader } from '@/components/ui/page-header';

export default async function NuevaFacturaPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre, cuit, condicion_iva, direccion, localidad')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true)
    .order('nombre');

  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, tipo, unidad, especie, variedad, campania, categoria, raza')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true)
    .order('tipo')
    .order('nombre');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva factura"
        backHref="/admin/facturas"
        backLabel="Volver a facturas"
        breadcrumbs={[
          { label: 'Facturas', href: '/admin/facturas' },
          { label: 'Nueva factura' },
        ]}
      />

      <FacturaForm
        clientes={clientes ?? []}
        productos={productos ?? []}
        puntoVenta={ctx.productor.punto_venta || '0001'}
      />
    </div>
  );
}
