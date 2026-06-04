import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, TrendingUp, TrendingDown, Wallet, BookOpen } from 'lucide-react';
import { calcularSaldoCliente } from '@/lib/calcular-saldo';
import { formatARS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

type SP = Promise<{ q?: string; filtro?: string }>;

export default async function CuentasCorrientesPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const filtro = params.filtro ?? 'todos';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  let queryClientes = supabase
    .from('clientes')
    .select('id, nombre, cuit, localidad, saldo_cta_cte, activo, tipo')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true);

  if (q) queryClientes = queryClientes.or(`nombre.ilike.%${q}%,cuit.ilike.%${q}%`);

  const { data: clientes } = await queryClientes.order('nombre');

  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, cliente_id, total, estado, fecha')
    .eq('productor_id', ctx.productor.id)
    .neq('estado', 'borrador')
    .neq('estado', 'anulada');

  const { data: cheques } = await supabase
    .from('cheques_recibidos')
    .select('id, cliente_id, factura_id, importe, estado, fecha_emision')
    .eq('productor_id', ctx.productor.id);

  const conSaldos = (clientes ?? []).map((c) => {
    const facsCliente = (facturas ?? []).filter((f) => f.cliente_id === c.id);
    const chqsCliente = (cheques ?? []).filter((ch) => ch.cliente_id === c.id);
    const saldo = calcularSaldoCliente(
      Number(c.saldo_cta_cte) || 0,
      facsCliente as any,
      chqsCliente as any
    );
    return { cliente: c, saldo };
  });

  let filtrados = conSaldos;
  if (filtro === 'con-deuda') filtrados = conSaldos.filter((x) => x.saldo.saldo_total > 0);
  else if (filtro === 'sin-deuda') filtrados = conSaldos.filter((x) => x.saldo.saldo_total === 0);
  else if (filtro === 'a-favor') filtrados = conSaldos.filter((x) => x.saldo.saldo_total < 0);

  const totalDeudores = conSaldos.filter((x) => x.saldo.saldo_total > 0).length;
  const totalConSaldoFavor = conSaldos.filter((x) => x.saldo.saldo_total < 0).length;
  const sumaDeuda = conSaldos.reduce(
    (s, x) => s + (x.saldo.saldo_total > 0 ? x.saldo.saldo_total : 0),
    0
  );
  const sumaFavor = conSaldos.reduce(
    (s, x) => s + (x.saldo.saldo_total < 0 ? Math.abs(x.saldo.saldo_total) : 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas Corrientes"
        icon="💰"
        subtitle="Saldo calculado dinámicamente desde facturas y cheques"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Clientes" value={String(conSaldos.length)} icon={Users} color="primary" />
        <KpiCard
          label="Te deben"
          value={String(totalDeudores)}
          sub={`$${formatARS(sumaDeuda)}`}
          icon={TrendingUp}
          color="red"
        />
        <KpiCard
          label="Saldo a favor"
          value={String(totalConSaldoFavor)}
          sub={`$${formatARS(sumaFavor)}`}
          icon={TrendingDown}
          color="emerald"
        />
        <KpiCard
          label="Saldo neto"
          value={`$${formatARS(Math.abs(sumaDeuda - sumaFavor))}`}
          icon={Wallet}
          color={sumaDeuda >= sumaFavor ? 'red' : 'emerald'}
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
            placeholder="Nombre, CUIT..."
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Mostrar
          </label>
          <select
            name="filtro"
            defaultValue={filtro}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="todos">Todos</option>
            <option value="con-deuda">🔴 Con deuda</option>
            <option value="sin-deuda">⚪ Sin deuda</option>
            <option value="a-favor">🟢 Saldo a favor</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
      </form>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={q || filtro !== 'todos' ? 'Sin resultados' : 'No hay clientes activos'}
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    Cliente
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    CUIT
                  </th>
                  <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    Pendientes
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    Saldo
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(({ cliente, saldo }) => {
                  const tieneDeuda = saldo.saldo_total > 0;
                  const aFavor = saldo.saldo_total < 0;
                  return (
                    <tr
                      key={cliente.id}
                      className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/cuentas-corrientes/${cliente.id}`}
                          className="font-medium hover:text-[var(--primary)]"
                        >
                          {cliente.nombre}
                        </Link>
                        {cliente.localidad && (
                          <p className="text-xs text-[var(--fg-muted)]">{cliente.localidad}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-[var(--fg-muted)]">
                        {cliente.cuit ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {saldo.facturas_pendientes_cantidad > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                            {saldo.facturas_pendientes_cantidad}
                          </span>
                        ) : (
                          <span className="text-[var(--fg-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`font-bold mono ${
                            tieneDeuda
                              ? 'text-red-700'
                              : aFavor
                              ? 'text-emerald-700'
                              : 'text-[var(--fg-muted)]'
                          }`}
                        >
                          {saldo.saldo_total === 0
                            ? 'Sin deuda'
                            : `$${formatARS(Math.abs(saldo.saldo_total))}`}
                        </span>
                        {aFavor && (
                          <span className="text-xs text-emerald-700 block">a favor</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/cuentas-corrientes/${cliente.id}`}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition"
                        >
                          📒 Ver cuenta
                        </Link>
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
