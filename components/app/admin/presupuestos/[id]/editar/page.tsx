import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { PresupuestoForm } from '../../presupuesto-form';

export default async function EditarPresupuestoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: pres } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!pres) notFound();

  const { data: items } = await supabase
    .from('items_presupuesto')
    .select('producto_id, descripcion, unidad, cantidad, precio_unitario')
    .eq('presupuesto_id', id)
    .order('orden');

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
          href={`/admin/presupuestos/${id}`}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver al presupuesto
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          ✏️ Editar Presupuesto Nº {String(pres.numero).padStart(4, '0')}
        </h1>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <PresupuestoForm
          clientes={clientes ?? []}
          productos={productos ?? []}
          presupuesto={{
            id: pres.id,
            cliente_id: pres.cliente_id,
            fecha: pres.fecha,
            fecha_vencimiento: pres.fecha_vencimiento,
            concepto: pres.concepto,
            iva_porcentaje: Number(pres.iva_porcentaje),
            notas: pres.notas,
            estado: pres.estado,
            items: (items ?? []).map((it) => ({
              producto_id: it.producto_id,
              descripcion: it.descripcion,
              unidad: it.unidad,
              cantidad: Number(it.cantidad),
              precio_unitario: Number(it.precio_unitario),
            })),
          }}
        />
      </div>
    </div>
  );
}
