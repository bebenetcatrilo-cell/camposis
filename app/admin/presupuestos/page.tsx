import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatARS, formatFecha } from '@/lib/utils';

const ESTADOS: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', icon: '⏳', bg: 'bg-amber-100', text: 'text-amber-700' },
  aprobado: { label: 'Aprobado', icon: '✓', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rechazado: { label: 'Rechazado', icon: '✗', bg: 'bg-red-100', text: 'text-red-700' },
  facturado: { label: 'Facturado', icon: '🧾', bg: 'bg-blue-100', text: 'text-blue-700' },
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

  // KPIs
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
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            📋 Presupuestos
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            Cotizaciones de venta a tus clientes
          </p>
        </div>
        <Link
          href="/admin/presupuestos/nuevo"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          + Nuevo presupuesto
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total" value={String(kpis.total)} icon="📋" />
        <Card label="Pendientes" value={String(kpis.pendientes)} icon="⏳" />
        <Card label="Aprobados" value={String(kpis.aprobados)} icon="✓" />
        <Card label="Monto pendiente" value={formatARS(kpis.monto_pendiente)} icon="💰" />
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

      {/* Tabla */}
      {!presupuestos || presupuestos.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
          <div className="text-5xl mb-3">📋</div>
          <h2 className="text-lg font-bold">
            {q || estado !== 'todos' ? 'Sin resultados' : 'No tenés presupuestos'}
          </h2>
          {!q && estado === 'todos' && (
            <>
              <p className="text-[var(--fg-muted)] text-sm mt-2">
                Creá tu primer presupuesto para empezar.
              </p>
              <Link
                href="/admin/presupuestos/nuevo"
                className="inline-block mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
              >
                + Crear el primero
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Nº</th>
                  <th className="px-5 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-5 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-5 py-3 text-left font-semibold">Concepto</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {presupuestos.map((p) => {
                  const est = ESTADOS[p.estado] ?? ESTADOS.pendiente;
                  return (
                    <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/presupuestos/${p.id}`}
                          className="font-mono font-bold text-[var(--primary)] hover:underline"
                        >
                          {String(p.numero).padStart(4, '0')}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs">{formatFecha(p.fecha)}</td>
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
                      <td className="px-5 py-3 text-right font-semibold">
                        {formatARS(Number(p.total))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${est.bg} ${est.text}`}>
                          {est.icon} {est.label}
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

function Card({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
            {label}
          </div>
          <div className="text-lg font-extrabold mt-0.5 truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}
