import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ImprimirRemitoBtn } from './imprimir-btn';
import { AccionesRemito } from './acciones';
import { User, Package, Calendar, Truck, FileText } from 'lucide-react';

const ESTADOS: Record<string, { label: string; icon: string; color: 'gray' | 'emerald' | 'red' }> = {
  borrador: { label: 'Borrador', icon: '📝', color: 'gray' },
  emitido: { label: 'Emitido', icon: '✅', color: 'emerald' },
  anulado: { label: 'Anulado', icon: '✗', color: 'red' },
};

export default async function RemitoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: remito } = await supabase
    .from('remitos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();
  if (!remito) notFound();

  const { data: items } = await supabase
    .from('items_remito')
    .select('*')
    .eq('remito_id', id)
    .order('orden');

  const est = ESTADOS[remito.estado] ?? ESTADOS.borrador;
  const numeroFmt = `R ${remito.punto_venta}-${String(remito.numero).padStart(8, '0')}`;
  const p = ctx.productor;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={numeroFmt}
        icon="📦"
        subtitle={`${formatFecha(remito.fecha)} · ${remito.cliente_nombre}`}
        backHref="/admin/remitos"
        backLabel="Volver a remitos"
        badge={<StatusBadge label={est.label} icon={est.icon} color={est.color} size="md" />}
        actions={
          <div className="flex gap-2 flex-wrap">
            <ImprimirRemitoBtn
              remito={remito}
              items={items ?? []}
              productor={{
                nombre: p.nombre,
                nombre_campo: p.nombre_campo ?? null,
                cuit: p.cuit ?? null,
                direccion: p.direccion ?? null,
                localidad: p.localidad ?? null,
                provincia: p.provincia ?? null,
                telefono: p.telefono ?? null,
                email_contacto: p.email_contacto ?? null,
                logo_url: p.logo_url ?? null,
                color_primario: p.color_primario ?? '#4a7c2a',
              }}
            />
            <AccionesRemito id={remito.id} estado={remito.estado} numero={numeroFmt} />
          </div>
        }
      />

      {/* Cliente */}
      <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
          <h2 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold">Cliente</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-bold text-base">{remito.cliente_nombre}</p>
            {remito.cliente_cuit && (
              <p className="text-[var(--fg-muted)] text-xs mt-1">CUIT: <span className="font-mono">{remito.cliente_cuit}</span></p>
            )}
          </div>
          <div>
            {remito.cliente_direccion && <p className="text-sm">{remito.cliente_direccion}</p>}
            {remito.cliente_localidad && <p className="text-[var(--fg-muted)] text-xs">{remito.cliente_localidad}</p>}
          </div>
        </div>
        {remito.transporte && (
          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
            <span className="text-[var(--fg-muted)] text-xs uppercase tracking-wider font-bold">Transporte:</span>
            <span>{remito.transporte}</span>
          </div>
        )}
      </section>

      {/* Ítems */}
      <section className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Package className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
          <h2 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold">
            Mercadería ({items?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-hover)]">
            <tr>
              <th className="px-5 py-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Descripción</th>
              <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id} className="border-t border-[var(--border)]">
                <td className="px-5 py-3">{it.descripcion}</td>
                <td className="px-5 py-3 text-right font-mono">
                  {Number(it.cantidad).toLocaleString('es-AR', { maximumFractionDigits: 3 })} {it.unidad ?? ''}
                </td>
              </tr>
            ))}
            {(!items || items.length === 0) && (
              <tr><td colSpan={2} className="px-5 py-4 text-center text-[var(--fg-muted)] italic">Sin ítems</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-5 py-3 bg-[var(--bg-hover)] border-t border-[var(--border)] text-[11px] text-[var(--fg-muted)]">
          📦 Documento de entrega · sin valor fiscal · no afecta stock
        </div>
      </section>

      {/* Observaciones */}
      {remito.observaciones && (
        <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold mb-2">Observaciones</h2>
          <p className="text-sm whitespace-pre-wrap">{remito.observaciones}</p>
        </section>
      )}

      {/* Factura origen */}
      {remito.factura_id && (
        <div className="text-sm">
          <Link href={`/admin/facturas/${remito.factura_id}`}
            className="text-[var(--primary)] hover:underline inline-flex items-center gap-1">
            <FileText className="w-4 h-4" strokeWidth={2} /> Ver factura de origen →
          </Link>
        </div>
      )}

      <div className="text-xs text-[var(--fg-muted)] flex items-center gap-1">
        <Calendar className="w-3 h-3" strokeWidth={1.6} />
        Creado: {new Date(remito.created_at).toLocaleString('es-AR')}
      </div>
    </div>
  );
}
