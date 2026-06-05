import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Plus, DollarSign, Calendar, Ban } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

const formaCobroLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque_recibido: 'Cheque',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

type SearchParams = Promise<{ q?: string; estado?: string }>;

export default async function CobrosPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const estadoFiltro = params.estado ?? 'activos';

  const supabase = await createClient();

  let query = supabase
    .from('cobros')
    .select('id, numero, fecha, cliente_nombre, importe_total, forma_cobro, anulado')
    .eq('productor_id', ctx.productor.id)
    .order('fecha', { ascending: false });

  if (estadoFiltro === 'activos') query = query.eq('anulado', false);
  if (estadoFiltro === 'anulados') query = query.eq('anulado', true);
  if (q) query = query.ilike('cliente_nombre', `%${q}%`);

  const { data: cobros } = await query;

  const { data: todos } = await supabase
    .from('cobros')
    .select('importe_total, fecha, anulado')
    .eq('productor_id', ctx.productor.id);

  const totalCobros = (todos ?? []).filter(c => !c.anulado).length;
  const totalImporte = (todos ?? []).filter(c => !c.anulado).reduce((s, c) => s + Number(c.importe_total), 0);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const cobradoMes = (todos ?? [])
    .filter(c => !c.anulado && c.fecha >= primerDiaMes)
    .reduce((s, c) => s + Number(c.importe_total), 0);
  const cobrosMesCount = (todos ?? []).filter(c => !c.anulado && c.fecha >= primerDiaMes).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cobros"
        icon="💰"
        subtitle="Historial de cobros recibidos de clientes"
        actions={
          <Link href="/admin/cobros/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuevo cobro
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Cobros totales" value={String(totalCobros)} icon={Wallet} color="primary" />
        <KpiCard label="Importe total" value={`$${formatARS(totalImporte)}`} icon={DollarSign} color="emerald" />
        <KpiCard label="Cobros del mes" value={String(cobrosMesCount)} icon={Calendar} color="blue" />
        <KpiCard label="Cobrado este mes" value={`$${formatARS(cobradoMes)}`} icon={DollarSign} color="emerald" />
      </div>

      <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">Buscar</label>
            <input type="text" name="q" defaultValue={q} placeholder="Cliente..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"/>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">Estado</label>
            <div className="flex gap-2">
              <select name="estado" defaultValue={estadoFiltro}
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
                <option value="activos">Activos</option>
                <option value="anulados">Anulados</option>
                <option value="todos">Todos</option>
              </select>
              <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white rounded-[6px] font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </div>

      {!cobros || cobros.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={q ? 'Sin resultados' : 'No tenés cobros registrados'}
          description={!q ? 'Registrá tu primer cobro para empezar a cobrar facturas.' : 'Probá cambiar los filtros.'}
          action={!q ? { label: '+ Registrar primer cobro', href: '/admin/cobros/nuevo' } : undefined}
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nº</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cliente</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Forma</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Importe</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cobros.map(c => (
                  <tr key={c.id} className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition ${c.anulado ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3 mono font-semibold">
                      <Link href={`/admin/cobros/${c.id}`} className="text-[var(--primary)] hover:underline">
                        #{String(c.numero).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-5 py-3 mono text-[12px]">{formatFecha(c.fecha)}</td>
                    <td className="px-5 py-3">{c.cliente_nombre}</td>
                    <td className="px-5 py-3 text-[12px] text-[var(--fg-muted)]">{formaCobroLabels[c.forma_cobro] ?? c.forma_cobro}</td>
                    <td className="px-5 py-3 text-right mono font-bold text-[var(--green)]">${formatARS(Number(c.importe_total))}</td>
                    <td className="px-5 py-3">
                      {c.anulado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-card-3)] text-[var(--fg-muted)] rounded-[4px] text-[10px] font-bold">
                          <Ban className="w-3 h-3" strokeWidth={2.5} />
                          ANULADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--green-l)] text-[var(--green)] rounded-[4px] text-[10px] font-bold">
                          ✅ COBRADO
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
