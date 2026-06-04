import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Receipt, FileText, CheckCircle, DollarSign, Plus, AlertCircle } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

const TIPOS: Record<string, { label: string; color: 'blue' | 'emerald' | 'purple' | 'gray' }> = {
  A: { label: 'Factura A', color: 'blue' },
  B: { label: 'Factura B', color: 'emerald' },
  C: { label: 'Factura C', color: 'purple' },
  X: { label: 'Recibo X', color: 'gray' },
};

const ESTADOS: Record<string, { label: string; icon: string; color: 'gray' | 'amber' | 'emerald' | 'red' }> = {
  borrador: { label: 'Borrador', icon: '📝', color: 'gray' },
  emitida: { label: 'Pendiente', icon: '⏳', color: 'amber' },
  cobrada: { label: 'Cobrada', icon: '✓', color: 'emerald' },
  anulada: { label: 'Anulada', icon: '✗', color: 'red' },
};

type SP = Promise<{ q?: string; estado?: string; tipo?: string }>;

export default async function FacturasPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const estado = params.estado ?? 'todos';
  const tipo = params.tipo ?? 'todos';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  let query = supabase
    .from('facturas')
    .select('id, tipo, punto_venta, numero, fecha, cliente_nombre, concepto, total, estado, cae')
    .eq('productor_id', ctx.productor.id);

  if (estado !== 'todos') query = query.eq('estado', estado);
  if (tipo !== 'todos') query = query.eq('tipo', tipo);
  if (q) query = query.or(`cliente_nombre.ilike.%${q}%,concepto.ilike.%${q}%`);

  const { data: facturas } = await query
    .order('fecha', { ascending: false })
    .order('numero', { ascending: false });

  // KPIs
  const { data: kpiData } = await supabase
    .from('facturas')
    .select('estado, total')
    .eq('productor_id', ctx.productor.id);

  const kpis = (kpiData ?? []).reduce(
    (acc, f) => {
      const t = Number(f.total) || 0;
      if (f.estado === 'emitida') { acc.emitidas++; acc.monto_emitido += t; }
      if (f.estado === 'cobrada') { acc.cobradas++; acc.monto_cobrado += t; }
      return acc;
    },
    { emitidas: 0, cobradas: 0, monto_emitido: 0, monto_cobrado: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturas"
        icon="🧾"
        subtitle={`Comprobantes emitidos · Punto de venta: ${ctx.productor.punto_venta || '0001'}`}
        actions={
          <Link
            href="/admin/facturas/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Nueva factura
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Pendientes"
          value={String(kpis.emitidas)}
          sub={`$${formatARS(kpis.monto_emitido)}`}
          icon={FileText}
          color="amber"
        />
        <KpiCard
          label="A cobrar"
          value={`$${formatARS(kpis.monto_emitido)}`}
          icon={AlertCircle}
          color="red"
        />
        <KpiCard
          label="Cobradas"
          value={String(kpis.cobradas)}
          icon={CheckCircle}
          color="emerald"
        />
        <KpiCard
          label="Total cobrado"
          value={`$${formatARS(kpis.monto_cobrado)}`}
          icon={DollarSign}
          color="primary"
        />
      </div>

      {/* Filtros */}
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
            Tipo
          </label>
          <select
            name="tipo"
            defaultValue={tipo}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="A">Factura A</option>
            <option value="B">Factura B</option>
            <option value="C">Factura C</option>
            <option value="X">Recibo X</option>
          </select>
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
            <option value="borrador">📝 Borrador</option>
            <option value="emitida">⏳ Pendientes</option>
            <option value="cobrada">✓ Cobradas</option>
            <option value="anulada">✗ Anuladas</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
        {(q || estado !== 'todos' || tipo !== 'todos') && (
          <Link
            href="/admin/facturas"
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      {!facturas || facturas.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            q || estado !== 'todos' || tipo !== 'todos'
              ? 'Sin resultados'
              : 'No tenés facturas todavía'
          }
          description={
            !q && estado === 'todos' && tipo === 'todos'
              ? 'Creá tu primera factura para empezar a registrar tus ventas.'
              : undefined
          }
          action={
            !q && estado === 'todos' && tipo === 'todos'
              ? { label: '+ Crear primera factura', href: '/admin/facturas/nuevo' }
              : undefined
          }
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Tipo</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nº</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cliente</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Concepto</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Total</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                  <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">CAE</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => {
                  const tipoInfo = TIPOS[f.tipo] ?? { label: f.tipo, color: 'gray' as const };
                  const est = ESTADOS[f.estado] ?? ESTADOS.borrador;
                  const numeroFmt = `${f.punto_venta}-${String(f.numero).padStart(8, '0')}`;
                  return (
                    <tr key={f.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition">
                      <td className="px-5 py-3">
                        <StatusBadge label={tipoInfo.label} color={tipoInfo.color} />
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/facturas/${f.id}`}
                          className="font-mono font-bold text-[var(--primary)] hover:underline"
                        >
                          {numeroFmt}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{formatFecha(f.fecha)}</td>
                      <td className="px-5 py-3 font-medium">{f.cliente_nombre}</td>
                      <td className="px-5 py-3 text-[var(--fg-muted)] max-w-[200px] truncate">
                        {f.concepto ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold mono">
                        ${formatARS(Number(f.total))}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge label={est.label} icon={est.icon} color={est.color} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        {f.cae ? (
                          <span className="text-emerald-700" title={f.cae}>✓</span>
                        ) : f.tipo !== 'X' && f.estado === 'emitida' ? (
                          <span className="text-amber-600" title="Falta cargar CAE">⚠</span>
                        ) : (
                          <span className="text-[var(--fg-muted)]">—</span>
                        )}
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
