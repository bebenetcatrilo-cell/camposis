import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PresupuestoForm } from '../presupuesto-form';

export default async function NuevoPresupuestoPage() {
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
    <div className="space-y-6 max-w-4xl">
      <header>
        <Link
          href="/admin/presupuestos"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a presupuestos
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          📋 Nuevo presupuesto
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Creá un presupuesto para enviarle a un cliente.
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <PresupuestoForm clientes={clientes ?? []} productos={productos ?? []} />
      </div>
    </div>
  );
}
