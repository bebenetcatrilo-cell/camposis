import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Plus, FileText, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

const estadoLabels: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  pagada:    { label: 'Pagada',    bg: 'var(--green-l)',  color: 'var(--green)',  icon: '✅' },
  pendiente: { label: 'Pendiente', bg: 'var(--orange-l)', color: 'var(--orange)', icon: '⏳' },
  parcial:   { label: 'Parcial',   bg: 'var(--blue-l)',   color: 'var(--blue)',   icon: '½' },
  anulada:   { label: 'Anulada',   bg: 'var(--bg-card-3)',color: 'var(--fg-muted)', icon: '✕' },
};

type SearchParams = Promise<{ q?: string; estado?: string }>;

export default async function ComprasPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const estadoFiltro = params.estado ?? 'todas';

  const supabase = await createClient();

  let query = supabase
    .from('compras')
    .select('id, fecha, numero_factura, proveedor_nombre, total, monto_pagado, estado, forma_pago')
    .eq('productor_id', ctx.productor.id)
    .order('fecha', { ascending: false });

  if (estadoFiltro !== 'todas') query = query.eq('estado', estadoFiltro);
  if (q) query = query.or(`proveedor_nombre.ilike.%${q}%,numero_factura.ilike.%${q}%`);

  const { data: compras } = await query;

  // KPIs (todas)
  const { data: todas } = await supabase
    .from('compras')
    .select('total, monto_pagado, estado')
    .eq('productor_id', ctx.productor.id);

  const totalCompras = todas?.length ?? 0;
  const totalMonto = (todas ?? []).reduce((s, c) => s + Number(c.total), 0);
  const totalPendiente = (todas ?? [])
    .filter(c => c.estado === 'pendiente' || c.estado === 'parcial')
    .reduce((s, c) => s + (Number(c.total) - Number(c.monto_pagado)), 0);
  const compraPendientes = (todas ?? []).filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compras"
        icon="🛒"
        subtitle="Facturas de proveedores y registro de compras"
        actions={
          <Link
            href="/admin/compras/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nueva compra
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total compras" value={String(totalCompras)} icon={FileText} color="primary" />
        <KpiCard label="Monto total" value={`$${formatARS(totalMonto)}`} icon={DollarSign} color="blue" />
        <KpiCard label="Pendientes" value={String(compraPendientes)} icon={Clock} color="amber" />
        <KpiCard label="A pagar" value={`$${formatARS(totalPendiente)}`} icon={DollarSign} color="red" />
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">Buscar</label>
            <input type="text" name="q" defaultValue={q} placeholder="Proveedor o nº factura..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"/>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">Estado</label>
            <div className="flex gap-2">
              <select name="estado" defaultValue={estadoFiltro}
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
                <option value="todas">Todas</option>
                <option value="pagada">Pagadas</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Parciales</option>
                <option value="anulada">Anuladas</option>
              </select>
              <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white rounded-[6px] font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Listado */}
      {!compras || compras.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={q || estadoFiltro !== 'todas' ? 'Sin resultados' : 'No tenés compras cargadas'}
          description={!q && estadoFiltro === 'todas'
            ? 'Cargá tu primera compra para empezar a llevar el control.'
            : 'Probá cambiar los filtros.'}
          action={!q && estadoFiltro === 'todas' ? {
            label: '+ Cargar primera compra',
            href: '/admin/compras/nueva'
          } : undefined}
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nº Factura</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Proveedor</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Forma pago</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Total</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {compras.map(c => {
                  const est = estadoLabels[c.estado] ?? estadoLabels.pagada;
                  const pendiente = Number(c.total) - Number(c.monto_pagado);
                  return (
                    <tr key={c.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition">
                      <td className="px-5 py-3 mono text-[12px]">{formatFecha(c.fecha)}</td>
                      <td className="px-5 py-3 mono font-semibold">
                        <Link href={`/admin/compras/${c.id}`} className="text-[var(--primary)] hover:underline">
                          {c.numero_factura || '-'}
                        </Link>
                      </td>
                      <td className="px-5 py-3">{c.proveedor_nombre}</td>
                      <td className="px-5 py-3 text-[12px] text-[var(--fg-muted)] capitalize">
                        {c.forma_pago.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3 text-right mono font-bold">
                        ${formatARS(Number(c.total))}
                        {pendiente > 0 && c.estado !== 'anulada' && (
                          <div className="text-[10px] text-[var(--red)] font-normal">
                            Falta: ${formatARS(pendiente)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold" style={{ background: est.bg, color: est.color }}>
                          {est.icon} {est.label.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
