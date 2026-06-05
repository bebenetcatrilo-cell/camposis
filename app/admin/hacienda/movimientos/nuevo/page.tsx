import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { MovimientoForm } from './movimiento-form';

export const dynamic = 'force-dynamic';

export default async function NuevoMovimientoHaciendaPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');
  if (ctx.rol !== 'admin_productor') redirect('/admin/hacienda');

  const supabase = await createClient();

  const [{ data: categorias }, { data: rodeos }, { data: proveedores }, { data: clientes }] = await Promise.all([
    supabase.from('categorias_hacienda').select('id, nombre, color')
      .eq('productor_id', ctx.productor.id).eq('activo', true).order('orden'),
    supabase.from('rodeos').select('id, nombre')
      .eq('productor_id', ctx.productor.id).eq('activo', true).order('nombre'),
    supabase.from('proveedores').select('id, nombre')
      .eq('productor_id', ctx.productor.id).eq('activo', true).order('nombre'),
    supabase.from('clientes').select('id, nombre')
      .eq('productor_id', ctx.productor.id).eq('activo', true).order('nombre'),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo movimiento de hacienda"
        icon="🐄"
        breadcrumbs={[
          { label: 'Hacienda', href: '/admin/hacienda' },
          { label: 'Movimientos', href: '/admin/hacienda/movimientos' },
          { label: 'Nuevo' },
        ]}
      />
      <MovimientoForm
        categorias={categorias ?? []}
        rodeos={rodeos ?? []}
        proveedores={proveedores ?? []}
        clientes={clientes ?? []}
      />
    </div>
  );
}
