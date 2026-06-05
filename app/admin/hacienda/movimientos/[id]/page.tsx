import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Ban, Truck, Users } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AnularBtn } from './anular-btn';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const tipoLabels: Record<string, { label: string; icon: string }> = {
  compra: { label: 'Compra', icon: '🛒' },
  venta: { label: 'Venta', icon: '💰' },
  paricion: { label: 'Parición', icon: '🐂' },
  muerte: { label: 'Muerte', icon: '☠️' },
  consumo: { label: 'Consumo', icon: '🍖' },
  traslado: { label: 'Traslado', icon: '🔀' },
  recategorizacion: { label: 'Recategorización', icon: '🔄' },
};

export default async function MovimientoDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: mov } = await supabase
    .from('movimientos_hacienda')
    .select(`
      *,
      categoria:categorias_hacienda!movimientos_hacienda_categoria_id_fkey(id, nombre, color),
      categoria_destino:categorias_hacienda!movimientos_hacienda_categoria_destino_id_fkey(id, nombre),
      rodeo:rodeos!movimientos_hacienda_rodeo_id_fkey(id, nombre),
      rodeo_destino:rodeos!movimientos_hacienda_rodeo_destino_id_fkey(id, nombre)
    `)
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!mov) notFound();

  const t = tipoLabels[mov.tipo] ?? { label: mov.tipo, icon: '📋' };
  const cat = Array.isArray(mov.categoria) ? mov.categoria[0] : mov.categoria;
  const catDest = Array.isArray(mov.categoria_destino) ? mov.categoria_destino[0] : mov.categoria_destino;
  const rodeo = Array.isArray(mov.rodeo) ? mov.rodeo[0] : mov.rodeo;
  const rodeoDest = Array.isArray(mov.rodeo_destino) ? mov.rodeo_destino[0] : mov.rodeo_destino;
  const esAdmin = ctx.rol === 'admin_productor';

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${t.icon} ${t.label}`}
        icon="🐄"
        subtitle={`${mov.cantidad} cabezas de ${cat?.nombre} - ${formatFecha(mov.fecha)}`}
        breadcrumbs={[
          { label: 'Hacienda', href: '/admin/hacienda' },
          { label: 'Movimientos', href: '/admin/hacienda/movimientos' },
          { label: t.label },
        ]}
        actions={esAdmin && !mov.anulado && <AnularBtn id={mov.id} />}
      />

      {mov.anulado && (
        <div className="bg-[var(--bg-card-3)] border border-[var(--border-2)] rounded-[12px] p-4 flex items-center gap-3">
          <Ban className="w-5 h-5 text-[var(--fg-muted)]" />
          <p className="text-[13px] font-bold text-[var(--fg-muted)]">MOVIMIENTO ANULADO (stock revertido)</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3">Datos</h3>
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold">Fecha</dt>
                <dd className="mono">{formatFecha(mov.fecha)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold">Cantidad</dt>
                <dd className="mono font-bold">{mov.cantidad} cabezas</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold">Categoría</dt>
                <dd>{cat?.nombre} {catDest && <span className="text-[var(--fg-subtle)]">→ {catDest.nombre}</span>}</dd>
              </div>
              {(rodeo || rodeoDest) && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold">Rodeo</dt>
                  <dd>{rodeo?.nombre ?? '-'} {rodeoDest && <span className="text-[var(--fg-subtle)]">→ {rodeoDest.nombre}</span>}</dd>
                </div>
              )}
              {mov.peso_promedio_kg && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold">Peso promedio</dt>
                  <dd className="mono">{Number(mov.peso_promedio_kg)} kg/cabeza</dd>
                </div>
              )}
              {mov.peso_total_kg && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold">Peso total</dt>
                  <dd className="mono font-bold">{formatARS(Number(mov.peso_total_kg))} kg</dd>
                </div>
              )}
              {mov.proveedor_nombre && (
                <div className="col-span-2">
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Proveedor
                  </dt>
                  <dd>{mov.proveedor_nombre}</dd>
                </div>
              )}
              {mov.cliente_nombre && (
                <div className="col-span-2">
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" /> Cliente
                  </dt>
                  <dd>{mov.cliente_nombre}</dd>
                </div>
              )}
              {mov.motivo && (
                <div className="col-span-2">
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold">Motivo</dt>
                  <dd>{mov.motivo}</dd>
                </div>
              )}
            </dl>
            {mov.observaciones && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--fg-muted)] font-semibold mb-1">Observaciones</p>
                <p className="text-[12px] whitespace-pre-line">{mov.observaciones}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {mov.importe_total && (
            <div className="bg-[var(--primary-ll)] border-2 border-[var(--primary)] rounded-[12px] p-5">
              <p className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider">Importe</p>
              <p className="text-[28px] font-bold mono text-[var(--primary)] leading-tight mt-1">
                ${formatARS(Number(mov.importe_total))}
              </p>
              {mov.precio_por_kg && (
                <p className="text-[11px] text-[var(--primary)] mono mt-1">
                  ${formatARS(Number(mov.precio_por_kg))} / kg
                </p>
              )}
              {mov.precio_por_cabeza && (
                <p className="text-[11px] text-[var(--primary)] mono mt-1">
                  ${formatARS(Number(mov.precio_por_cabeza))} / cabeza
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
