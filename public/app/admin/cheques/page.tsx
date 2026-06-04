import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NuevoChequeBoton } from './nuevo-cheque-boton';
import { formatARS, formatFecha } from '@/lib/utils';

const ESTADOS_REC: Record<string, { label: string; icon: string; color: string }> = {
  cartera: { label: 'En cartera', icon: '📥', color: 'bg-blue-100 text-blue-700' },
  depositado: { label: 'Depositado', icon: '💼', color: 'bg-amber-100 text-amber-700' },
  acreditado: { label: 'Acreditado', icon: '✓', color: 'bg-emerald-100 text-emerald-700' },
  rechazado: { label: 'Rechazado', icon: '❌', color: 'bg-red-100 text-red-700' },
  endosado: { label: 'Endosado', icon: '↪', color: 'bg-purple-100 text-purple-700' },
  vendido: { label: 'Vendido', icon: '💵', color: 'bg-cyan-100 text-cyan-700' },
  anulado: { label: 'Anulado', icon: '⛔', color: 'bg-gray-100 text-gray-700' },
};

const ESTADOS_EM: Record<string, { label: string; icon: string; color: string }> = {
  emitido: { label: 'Emitido', icon: '📤', color: 'bg-amber-100 text-amber-700' },
  entregado: { label: 'Entregado', icon: '🤝', color: 'bg-blue-100 text-blue-700' },
  cobrado: { label: 'Cobrado', icon: '💰', color: 'bg-emerald-100 text-emerald-700' },
  anulado: { label: 'Anulado', icon: '⛔', color: 'bg-gray-100 text-gray-700' },
};

type SP = Promise<{ tab?: string; q?: string; estado?: string; periodo?: string }>;

export default async function ChequesPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const tab = params.tab ?? 'resumen';
  const q = params.q?.trim() ?? '';
  const estado = params.estado ?? 'todos';
  const periodo = params.periodo ?? 'todos';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const ultimoDiaMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  // ── Traer todos para KPIs ──
  const { data: allRec } = await supabase
    .from('cheques_recibidos')
    .select('*')
    .eq('productor_id', ctx.productor.id)
    .order('fecha_cobro', { ascending: true });

  const { data: allEm } = await supabase
    .from('cheques_emitidos')
    .select('*')
    .eq('productor_id', ctx.productor.id)
    .order('fecha_pago', { ascending: true });

  // ── Filtrar según tab + filtros ──
  function filtrarRec() {
    let arr = allRec ?? [];
    if (estado !== 'todos') arr = arr.filter((c) => c.estado === estado);
    if (q) {
      const qLow = q.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.numero.toLowerCase().includes(qLow) ||
          c.banco_emisor.toLowerCase().includes(qLow) ||
          (c.a_nombre_de?.toLowerCase() || '').includes(qLow)
      );
    }
    if (periodo === 'mes') arr = arr.filter((c) => c.fecha_cobro >= primerDiaMes && c.fecha_cobro <= ultimoDiaMes);
    if (periodo === 'proximos7') arr = arr.filter((c) => c.fecha_cobro >= hoy && c.fecha_cobro <= en7);
    if (periodo === 'proximos30') arr = arr.filter((c) => c.fecha_cobro >= hoy && c.fecha_cobro <= en30);
    if (periodo === 'vencidos') arr = arr.filter((c) => c.fecha_cobro < hoy && c.estado !== 'acreditado' && c.estado !== 'vendido' && c.estado !== 'anulado');
    return arr;
  }

  function filtrarEm() {
    let arr = allEm ?? [];
    if (estado !== 'todos') arr = arr.filter((c) => c.estado === estado);
    if (q) {
      const qLow = q.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.numero.toLowerCase().includes(qLow) ||
          c.banco_propio.toLowerCase().includes(qLow) ||
          c.beneficiario.toLowerCase().includes(qLow)
      );
    }
    if (periodo === 'mes') arr = arr.filter((c) => c.fecha_pago >= primerDiaMes && c.fecha_pago <= ultimoDiaMes);
    if (periodo === 'proximos7') arr = arr.filter((c) => c.fecha_pago >= hoy && c.fecha_pago <= en7);
    if (periodo === 'proximos30') arr = arr.filter((c) => c.fecha_pago >= hoy && c.fecha_pago <= en30);
    if (periodo === 'vencidos') arr = arr.filter((c) => c.fecha_pago < hoy && c.estado !== 'cobrado' && c.estado !== 'anulado');
    return arr;
  }

  const recibidos = filtrarRec();
  const emitidos = filtrarEm();

  // KPIs Resumen
  const enCartera = (allRec ?? []).filter((c) => c.estado === 'cartera');
  const depositados = (allRec ?? []).filter((c) => c.estado === 'depositado');
  const recVencidos = (allRec ?? []).filter((c) => c.fecha_cobro < hoy && c.estado !== 'acreditado' && c.estado !== 'vendido' && c.estado !== 'anulado');
  const emPendientes = (allEm ?? []).filter((c) => c.estado === 'emitido' || c.estado === 'entregado');
  const emVencidos = (allEm ?? []).filter((c) => c.fecha_pago < hoy && c.estado !== 'cobrado' && c.estado !== 'anulado');

  const sumImporte = (arr: any[]) => arr.reduce((s, c) => s + Number(c.importe || 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            💳 Cheques
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            Cheques recibidos y emitidos
          </p>
        </div>
        <NuevoChequeBoton />
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <Link
          href="/admin/cheques?tab=resumen"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            tab === 'resumen' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent hover:text-[var(--primary)]'
          }`}
        >
          📊 Resumen
        </Link>
        <Link
          href="/admin/cheques?tab=recibidos"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            tab === 'recibidos' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent hover:text-[var(--primary)]'
          }`}
        >
          📥 Recibidos ({allRec?.length ?? 0})
        </Link>
        <Link
          href="/admin/cheques?tab=emitidos"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            tab === 'emitidos' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent hover:text-[var(--primary)]'
          }`}
        >
          📤 Emitidos ({allEm?.length ?? 0})
        </Link>
      </div>

      {/* TAB: RESUMEN */}
      {tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Recibidos */}
            <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold mb-3">📥 Recibidos</h3>
              <div className="grid grid-cols-2 gap-3">
                <Mini label="En cartera" value={String(enCartera.length)} sub={`$${formatARS(sumImporte(enCartera))}`} color="text-blue-700" />
                <Mini label="Depositados" value={String(depositados.length)} sub={`$${formatARS(sumImporte(depositados))}`} color="text-amber-700" />
                {recVencidos.length > 0 && (
                  <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-bold text-red-900">⚠️ {recVencidos.length} cheques vencidos sin gestionar</p>
                    <p className="text-xs text-red-700">Total: ${formatARS(sumImporte(recVencidos))}</p>
                  </div>
                )}
              </div>
              <Link
                href="/admin/cheques?tab=recibidos"
                className="block mt-3 text-xs text-[var(--primary)] hover:underline"
              >
                Ver todos →
              </Link>
            </div>

            {/* Emitidos */}
            <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold mb-3">📤 Emitidos</h3>
              <div className="grid grid-cols-2 gap-3">
                <Mini label="Pendientes de pago" value={String(emPendientes.length)} sub={`$${formatARS(sumImporte(emPendientes))}`} color="text-amber-700" />
                {emVencidos.length > 0 && (
                  <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-bold text-red-900">⚠️ {emVencidos.length} cheques vencidos sin cobrar</p>
                    <p className="text-xs text-red-700">Total: ${formatARS(sumImporte(emVencidos))}</p>
                  </div>
                )}
              </div>
              <Link
                href="/admin/cheques?tab=emitidos"
                className="block mt-3 text-xs text-[var(--primary)] hover:underline"
              >
                Ver todos →
              </Link>
            </div>
          </div>

          {/* Próximos vencimientos */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold mb-3">📅 Próximos vencimientos (30 días)</h3>
            {(() => {
              const todos = [
                ...(allRec ?? [])
                  .filter((c) => c.fecha_cobro >= hoy && c.fecha_cobro <= en30 && c.estado !== 'acreditado' && c.estado !== 'vendido' && c.estado !== 'anulado')
                  .map((c) => ({ ...c, _tipo: 'recibido', _fecha: c.fecha_cobro })),
                ...(allEm ?? [])
                  .filter((c) => c.fecha_pago >= hoy && c.fecha_pago <= en30 && c.estado !== 'cobrado' && c.estado !== 'anulado')
                  .map((c) => ({ ...c, _tipo: 'emitido', _fecha: c.fecha_pago })),
              ].sort((a, b) => a._fecha.localeCompare(b._fecha));

              if (todos.length === 0) {
                return <p className="text-sm text-[var(--fg-muted)]">No hay vencimientos próximos.</p>;
              }
              return (
                <div className="space-y-2">
                  {todos.slice(0, 8).map((c) => (
                    <Link
                      key={c._tipo + c.id}
                      href={`/admin/cheques/${c._tipo}/${c.id}`}
                      className="block bg-[var(--bg-hover)] rounded-lg p-3 hover:bg-[var(--border)] transition"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">
                            {c._tipo === 'recibido' ? '📥' : '📤'} #{c.numero} · {c._tipo === 'recibido' ? c.banco_emisor : c.banco_propio}
                          </p>
                          <p className="text-xs text-[var(--fg-muted)]">
                            {c._tipo === 'recibido' ? `De: ${c.a_nombre_de ?? '—'}` : `Para: ${c.beneficiario}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">${formatARS(Number(c.importe))}</p>
                          <p className="text-xs text-[var(--fg-muted)]">{formatFecha(c._fecha)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {todos.length > 8 && (
                    <p className="text-xs text-[var(--fg-muted)] text-center mt-2">
                      Y {todos.length - 8} más...
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: RECIBIDOS */}
      {tab === 'recibidos' && (
        <>
          <Filtros tab="recibidos" q={q} estado={estado} periodo={periodo} estadosOptions={ESTADOS_REC} />

          {recibidos.length === 0 ? (
            <Vacio mensaje="Sin cheques recibidos con esos filtros" />
          ) : (
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                    <tr>
                      <th className="px-5 py-3 text-left">Nº</th>
                      <th className="px-5 py-3 text-left">Banco</th>
                      <th className="px-5 py-3 text-left">Cobro</th>
                      <th className="px-5 py-3 text-right">Importe</th>
                      <th className="px-5 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibidos.map((c) => {
                      const est = ESTADOS_REC[c.estado] ?? ESTADOS_REC.cartera;
                      const vencido = c.fecha_cobro < hoy && c.estado !== 'acreditado' && c.estado !== 'vendido' && c.estado !== 'anulado';
                      return (
                        <tr key={c.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                          <td className="px-5 py-3">
                            <Link href={`/admin/cheques/recibido/${c.id}`} className="font-mono font-bold text-[var(--primary)] hover:underline">
                              #{c.numero}
                            </Link>
                          </td>
                          <td className="px-5 py-3">{c.banco_emisor}</td>
                          <td className={`px-5 py-3 text-xs ${vencido ? 'text-red-700 font-semibold' : ''}`}>
                            {formatFecha(c.fecha_cobro)}{vencido ? ' ⚠️' : ''}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold">${formatARS(Number(c.importe))}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${est.color}`}>
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
        </>
      )}

      {/* TAB: EMITIDOS */}
      {tab === 'emitidos' && (
        <>
          <Filtros tab="emitidos" q={q} estado={estado} periodo={periodo} estadosOptions={ESTADOS_EM} />

          {emitidos.length === 0 ? (
            <Vacio mensaje="Sin cheques emitidos con esos filtros" />
          ) : (
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                    <tr>
                      <th className="px-5 py-3 text-left">Nº</th>
                      <th className="px-5 py-3 text-left">Banco propio</th>
                      <th className="px-5 py-3 text-left">Beneficiario</th>
                      <th className="px-5 py-3 text-left">Pago</th>
                      <th className="px-5 py-3 text-right">Importe</th>
                      <th className="px-5 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emitidos.map((c) => {
                      const est = ESTADOS_EM[c.estado] ?? ESTADOS_EM.emitido;
                      const vencido = c.fecha_pago < hoy && c.estado !== 'cobrado' && c.estado !== 'anulado';
                      return (
                        <tr key={c.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                          <td className="px-5 py-3">
                            <Link href={`/admin/cheques/emitido/${c.id}`} className="font-mono font-bold text-[var(--primary)] hover:underline">
                              #{c.numero}
                            </Link>
                          </td>
                          <td className="px-5 py-3">{c.banco_propio}</td>
                          <td className="px-5 py-3">{c.beneficiario}</td>
                          <td className={`px-5 py-3 text-xs ${vencido ? 'text-red-700 font-semibold' : ''}`}>
                            {formatFecha(c.fecha_pago)}{vencido ? ' ⚠️' : ''}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold">${formatARS(Number(c.importe))}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${est.color}`}>
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
        </>
      )}
    </div>
  );
}

function Mini({ label, value, sub, color = '' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[var(--bg-hover)] rounded-lg p-3">
      <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)] font-semibold">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--fg-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

function Vacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
      <div className="text-5xl mb-3">💳</div>
      <p className="text-sm text-[var(--fg-muted)]">{mensaje}</p>
    </div>
  );
}

function Filtros({
  tab,
  q,
  estado,
  periodo,
  estadosOptions,
}: {
  tab: string;
  q: string;
  estado: string;
  periodo: string;
  estadosOptions: Record<string, { label: string; icon: string; color: string }>;
}) {
  return (
    <form method="get" className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
      <input type="hidden" name="tab" value={tab} />
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase mb-1">Buscar</label>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Nº, banco, persona..."
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase mb-1">Estado</label>
        <select name="estado" defaultValue={estado} className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
          <option value="todos">Todos</option>
          {Object.entries(estadosOptions).map(([key, val]) => (
            <option key={key} value={key}>{val.icon} {val.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase mb-1">Período</label>
        <select name="periodo" defaultValue={periodo} className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
          <option value="todos">Todo el período</option>
          <option value="mes">📅 Este mes</option>
          <option value="proximos7">📅 Próximos 7 días</option>
          <option value="proximos30">📅 Próximos 30 días</option>
          <option value="vencidos">⚠️ Vencidos</option>
        </select>
      </div>
      <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm">
        Filtrar
      </button>
    </form>
  );
}
