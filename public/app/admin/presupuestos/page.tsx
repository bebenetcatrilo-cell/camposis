import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, CheckCircle, Clock, DollarSign, Plus, ClipboardList } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

const ESTADOS: Record<string, { label: string; icon: string; color: 'amber' | 'emerald' | 'red' | 'blue' | 'gray' }> = {
  pendiente: { label: 'Pendiente', icon: '⏳', color: 'amber' },
  aprobado: { label: 'Aprobado', icon: '✓', color: 'emerald' },
  rechazado: { label: 'Rechazado', icon: '✗', color: 'red' },
  facturado: { label: 'Facturado', icon: '🧾', color: 'blue' },
};

type SP = Promise<{ q?: string; estado?: string }>;

export default async function PresupuestosPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const estado = params.estado ?? 'todos';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  let query = supabase
    .from('presupuestos')
    .select('id, numero, fecha, cliente_nombre, concepto, total, estado, created_at')
    .eq('productor_id', ctx.productor.id);

  if (estado !== 'todos') query = query.eq('estado', estado);
  if (q) query = query.or(`cliente_nombre.ilike.%${q}%,concepto.ilike.%${q}%`);

  const { data: presupuestos } = await query.order('numero', { ascending: false });

  const { data: kpiData } = await supabase
    .from('presupuestos')
    .select('estado, total')
    .eq('productor_id', ctx.productor.id);

  const kpis = (kpiData ?? []).reduce(
    (acc, p) => {
      const tot = Number(p.total) || 0;
      acc.total++;
      acc.monto_total += tot;
      if (p.estado === 'pendiente') { acc.pendientes++; acc.monto_pendiente += tot; }
      if (p.estado === 'aprobado') { acc.aprobados++; acc.monto_aprobado += tot; }
      return acc;
    },
    { total: 0, pendientes: 0, aprobados: 0, monto_total: 0, monto_pendiente: 0, monto_aprobado: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuestos"
        icon="📋"
        subtitle="Cotizaciones de venta a tus clientes"
        actions={
          <Link
            href="/admin/presupuestos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Nuevo presupuesto
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total" value={String(kpis.total)} icon={FileText} color="primary" />
        <KpiCard label="Pendientes" value={String(kpis.pendientes)} icon={Clock} color="amber" />
        <KpiCard label="Aprobados" value={String(kpis.aprobados)} icon={CheckCircle} color="emerald" />
        <KpiCard
          label="Monto pendiente"
          value={`$${formatARS(kpis.monto_pendiente)}`}
          icon={DollarSign}
          color="amber"
        />
      </div>

      <form
        method="get"
        className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Buscar
          </label>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Cliente, concepto..."
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Estado
          </label>
          <select
            name="estado"
            defaultValue={estado}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">⏳ Pendientes</option>
            <option value="aprobado">✓ Aprobados</option>
            <option value="rechazado">✗ Rechazados</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
        {(q || estado !== 'todos') && (
          <Link
            href="/admin/presupuestos"
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Limpiar
          </Link>
        )}
      </form>

      {!presupuestos || presupuestos.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={q || estado !== 'todos' ? 'Sin resultados' : 'No tenés presupuestos todavía'}
          description={
            !q && estado === 'todos'
              ? 'Creá tu primer presupuesto para empezar a cotizar a tus clientes.'
              : undefined
          }
          action={
            !q && estado === 'todos'
              ? { label: '+ Crear primer presupuesto', href: '/admin/presupuestos/nuevo' }
              : undefined
          }
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nº</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cliente</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Concepto</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Total</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {presupuestos.map((p) => {
                  const est = ESTADOS[p.estado] ?? ESTADOS.pendiente;
                  return (
                    <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/presupuestos/${p.id}`}
                          className="font-mono font-bold text-[var(--primary)] hover:underline"
                        >
                          {String(p.numero).padStart(4, '0')}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{formatFecha(p.fecha)}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/presupuestos/${p.id}`}
                          className="font-medium hover:text-[var(--primary)]"
                        >
                          {p.cliente_nombre}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-[var(--fg-muted)] max-w-[250px] truncate">
                        {p.concepto ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold mono">
                        ${formatARS(Number(p.total))}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge label={est.label} icon={est.icon} color={est.color} />
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
