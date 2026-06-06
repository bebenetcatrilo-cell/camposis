import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Plus, Calendar, CheckCircle2, Ban, FileText } from 'lucide-react';
import { formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

const estadoBadge: Record<string, { label: string; cls: string; icon: string }> = {
  borrador: { label: 'BORRADOR', cls: 'bg-[var(--bg-card-3)] text-[var(--fg-muted)]', icon: '📝' },
  emitido: { label: 'EMITIDO', cls: 'bg-[var(--green-l)] text-[var(--green)]', icon: '✅' },
  anulado: { label: 'ANULADO', cls: 'bg-[var(--bg-card-3)] text-[var(--fg-muted)]', icon: '✗' },
};

type SearchParams = Promise<{ q?: string; estado?: string }>;

export default async function RemitosPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const estadoFiltro = params.estado ?? 'todos';

  const supabase = await createClient();

  let query = supabase
    .from('remitos')
    .select('id, punto_venta, numero, fecha, cliente_nombre, estado, factura_id')
    .eq('productor_id', ctx.productor.id)
    .order('fecha', { ascending: false })
    .order('numero', { ascending: false });

  if (estadoFiltro !== 'todos') query = query.eq('estado', estadoFiltro);
  if (q) query = query.ilike('cliente_nombre', `%${q}%`);

  const { data: remitos } = await query;

  const { data: todos } = await supabase
    .from('remitos')
    .select('estado, fecha')
    .eq('productor_id', ctx.productor.id);

  const total = (todos ?? []).length;
  const emitidos = (todos ?? []).filter(r => r.estado === 'emitido').length;
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const delMes = (todos ?? []).filter(r => r.estado !== 'anulado' && r.fecha >= primerDiaMes).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Remitos"
        icon="📦"
        subtitle="Comprobantes de entrega de mercadería"
        actions={
          <Link href="/admin/remitos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuevo remito
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Remitos totales" value={String(total)} icon={ClipboardList} color="primary" />
        <KpiCard label="Emitidos" value={String(emitidos)} icon={CheckCircle2} color="emerald" />
        <KpiCard label="Del mes" value={String(delMes)} icon={Calendar} color="blue" />
      </div>

      <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">Buscar</label>
            <input type="text" name="q" defaultValue={q} placeholder="Cliente..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">Estado</label>
            <div className="flex gap-2">
              <select name="estado" defaultValue={estadoFiltro}
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
                <option value="todos">Todos</option>
                <option value="borrador">Borrador</option>
                <option value="emitido">Emitido</option>
                <option value="anulado">Anulado</option>
              </select>
              <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white rounded-[6px] font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </div>

      {!remitos || remitos.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={q ? 'Sin resultados' : 'No tenés remitos'}
          description={!q ? 'Creá un remito a mano o generalo desde una factura.' : 'Probá cambiar los filtros.'}
          action={!q ? { label: '+ Nuevo remito', href: '/admin/remitos/nuevo' } : undefined}
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Número</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cliente</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Origen</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {remitos.map(r => {
                  const est = estadoBadge[r.estado] ?? estadoBadge.borrador;
                  const numFmt = `R ${r.punto_venta}-${String(r.numero).padStart(8, '0')}`;
                  return (
                    <tr key={r.id} className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition ${r.estado === 'anulado' ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3 mono font-semibold">
                        <Link href={`/admin/remitos/${r.id}`} className="text-[var(--primary)] hover:underline">
                          {numFmt}
                        </Link>
                      </td>
                      <td className="px-5 py-3 mono text-[12px]">{formatFecha(r.fecha)}</td>
                      <td className="px-5 py-3">{r.cliente_nombre}</td>
                      <td className="px-5 py-3 text-[12px] text-[var(--fg-muted)]">
                        {r.factura_id ? (
                          <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" strokeWidth={2} /> de factura</span>
                        ) : 'manual'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${est.cls}`}>
                          {r.estado === 'anulado' ? <Ban className="w-3 h-3" strokeWidth={2.5} /> : est.icon} {est.label}
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
