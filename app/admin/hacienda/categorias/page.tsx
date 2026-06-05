import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import { Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { CategoriasManager } from './categorias-manager';

export const dynamic = 'force-dynamic';

export default async function CategoriasPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from('categorias_hacienda')
    .select('id, nombre, sexo, color, orden, activo')
    .eq('productor_id', ctx.productor.id)
    .order('orden');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorías de hacienda"
        icon="🏷️"
        breadcrumbs={[
          { label: 'Hacienda', href: '/admin/hacienda' },
          { label: 'Categorías' },
        ]}
      />
      <CategoriasManager
        categorias={categorias ?? []}
        esAdmin={ctx.rol === 'admin_productor'}
      />
    </div>
  );
}
