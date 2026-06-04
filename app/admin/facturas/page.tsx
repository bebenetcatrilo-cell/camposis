import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatARS, formatFecha } from '@/lib/utils';

const TIPOS: Record<string, { label: string; color: string }> = {
  A: { label: 'Factura A', color: 'bg-blue-100 text-blue-700' },
  B: { label: 'Factura B', color: 'bg-emerald-100 text-emerald-700' },
  C: { label: 'Factura C', color: 'bg-purple-100 text-purple-700' },
  X: { label: 'Recibo X', color: 'bg-gray-100 text-gray-700' },
};

const ESTADOS: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  borrador: { label: 'Borrador', icon: '📝', bg: 'bg-gray-100', text: 'text-gray-700' },
  emitida: { label: 'Emitida', icon: '🧾', bg: 'bg-amber-100', text: 'text-amber-700' },
  cobrada: { label: 'Cobrada', icon: '✓', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  anulada: { label: 'Anulada', icon: '✗', bg: 'bg-red-100', text: 'text-red-700' },
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
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            🧾 Facturas
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            Comprobantes emitidos · Punto de venta: <strong>{ctx.productor.punto_venta || '0001'}</strong>
          </p>
        </div>
        <Link
          href="/admin/facturas/nuevo"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          + Nueva factura
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Emitidas pendientes" value={String(kpis.emitidas)} icon="🧾" />
        <Card label="A cobrar" value={formatARS(kpis.monto_emitido)} icon="💰" color="text-amber-700" />
        <Card label="Cobradas" value={String(kpis.cobradas)} icon="✓" color="text-emerald-700" />
        <Card label="Total cobrado" value={formatARS(kpis.monto_cobrado)} icon="💵" color="text-emerald-700" />
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
            <option value="emitida">🧾 Emitidas</option>
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
        <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
          <div className="text-5xl mb-3">🧾</div>
          <h2 className="text-lg font-bold">
            {q || estado !== 'todos' || tipo !== 'todos' ? 'Sin resultados' : 'No tenés facturas'}
          </h2>
          {!q && estado === 'todos' && tipo === 'todos' && (
            <>
              <p className="text-[var(--fg-muted)] text-sm mt-2">
                Creá tu primera factura.
              </p>
              <Link
                href="/admin/facturas/nuevo"
                className="inline-block mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
              >
                + Crear la primera
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
                  <th className="px-5 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-5 py-3 text-left font-semibold">Nº</th>
                  <th className="px-5 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-5 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-5 py-3 text-left font-semibold">Concepto</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 text-left font-semibold">Estado</th>
                  <th className="px-5 py-3 text-center font-semibold">CAE</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => {
                  const tipoInfo = TIPOS[f.tipo] ?? { label: f.tipo, color: 'bg-gray-100' };
                  const est = ESTADOS[f.estado] ?? ESTADOS.borrador;
                  const numeroFmt = `${f.punto_venta}-${String(f.numero).padStart(8, '0')}`;
                  return (
                    <tr key={f.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${tipoInfo.color}`}>
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/facturas/${f.id}`}
                          className="font-mono font-bold text-[var(--primary)] hover:underline"
                        >
                          {numeroFmt}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs">{formatFecha(f.fecha)}</td>
                      <td className="px-5 py-3 font-medium">{f.cliente_nombre}</td>
                      <td className="px-5 py-3 text-[var(--fg-muted)] max-w-[200px] truncate">
                        {f.concepto ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {formatARS(Number(f.total))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${est.bg} ${est.text}`}>
                          {est.icon} {est.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {f.cae ? (
                          <span className="text-xs text-emerald-700" title={f.cae}>✓</span>
                        ) : f.tipo !== 'X' && f.estado === 'emitida' ? (
                          <span className="text-xs text-amber-600" title="Falta cargar CAE">⚠</span>
                        ) : (
                          <span className="text-xs text-[var(--fg-muted)]">—</span>
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

function Card({ label, value, icon, color = '' }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
            {label}
          </div>
          <div className={`text-lg font-extrabold mt-0.5 truncate ${color}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}
