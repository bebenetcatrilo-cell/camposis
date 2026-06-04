import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { FacturaForm } from '../../factura-form';

export default async function EditarFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: fact } = await supabase
    .from('facturas')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!fact) notFound();

  // Solo borradores se pueden editar
  if (fact.estado !== 'borrador') {
    redirect(`/admin/facturas/${id}`);
  }

  const { data: items } = await supabase
    .from('items_factura')
    .select('producto_id, descripcion, unidad, cantidad, precio_unitario')
    .eq('factura_id', id)
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

  const numeroFmt = `${fact.punto_venta}-${String(fact.numero).padStart(8, '0')}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <Link
          href={`/admin/facturas/${id}`}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a la factura
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          ✏️ Editar borrador {numeroFmt}
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Solo borradores se pueden modificar.
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <FacturaForm
          clientes={clientes ?? []}
          productos={productos ?? []}
          puntoVenta={ctx.productor.punto_venta || '0001'}
          factura={{
            id: fact.id,
            tipo: fact.tipo,
            cliente_id: fact.cliente_id,
            fecha: fact.fecha,
            concepto: fact.concepto,
            iva_porcentaje: Number(fact.iva_porcentaje),
            notas: fact.notas,
            estado: fact.estado,
            cae: fact.cae,
            cae_vencimiento: fact.cae_vencimiento,
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
