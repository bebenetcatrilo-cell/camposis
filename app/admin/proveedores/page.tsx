import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Truck, CheckCircle2, AlertCircle, DollarSign, Plus } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; rubro?: string; estado?: string }>;

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const rubroFiltro = params.rubro?.trim() ?? '';
  const estadoFiltro = params.estado ?? 'activos';

  const supabase = await createClient();

  let query = supabase
    .from('proveedores')
    .select('id, nombre, cuit, condicion_iva, rubro, telefono, whatsapp, email, plazo_pago_dias, saldo_cta_cte, activo')
    .eq('productor_id', ctx.productor.id)
    .order('nombre');

  if (estadoFiltro === 'activos') query = query.eq('activo', true);
  if (estadoFiltro === 'inactivos') query = query.eq('activo', false);

  if (q) query = query.or(`nombre.ilike.%${q}%,cuit.ilike.%${q}%,rubro.ilike.%${q}%`);
  if (rubroFiltro) query = query.eq('rubro', rubroFiltro);

  const { data: proveedores } = await query;

  // KPIs (sin filtros)
  const { data: todos } = await supabase
    .from('proveedores')
    .select('id, saldo_cta_cte, activo, rubro')
    .eq('productor_id', ctx.productor.id);

  const total = todos?.length ?? 0;
  const activos = todos?.filter(p => p.activo).length ?? 0;
  const inactivos = total - activos;
  const totalAPagar = (todos ?? [])
    .filter(p => p.activo && Number(p.saldo_cta_cte) > 0)
    .reduce((s, p) => s + Number(p.saldo_cta_cte), 0);

  // Rubros únicos para filtro
  const rubrosUnicos = Array.from(new Set(
    (todos ?? []).map(p => p.rubro).filter((r): r is string => Boolean(r))
  )).sort();

  const hayProveedores = total > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Proveedores"
        subtitle="Quienes te venden insumos, servicios o productos"
        icon={<Truck className="w-5 h-5" />}
        action={
          <Link
            href="/admin/proveedores/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuevo proveedor
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total"
          value={String(total)}
          icon={<Truck className="w-4 h-4" />}
          color="primary"
        />
        <KpiCard
          label="Activos"
          value={String(activos)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="green"
        />
        <KpiCard
          label="Inactivos"
          value={String(inactivos)}
          icon={<AlertCircle className="w-4 h-4" />}
          color="orange"
        />
        <KpiCard
          label="Total a pagar"
          value={`$${formatARS(totalAPagar)}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="red"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <form className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">
              Buscar
            </label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nombre, CUIT, rubro..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">
              Rubro
            </label>
            <select
              name="rubro"
              defaultValue={rubroFiltro}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)] bg-white"
            >
              <option value="">Todos</option>
              {rubrosUnicos.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">
              Estado
            </label>
            <div className="flex gap-2">
              <select
                name="estado"
                defaultValue={estadoFiltro}
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)] bg-white"
              >
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
                <option value="todos">Todos</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-[6px] font-semibold hover:bg-[var(--primary-h)] transition text-[13px]"
              >
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Listado */}
      {!hayProveedores ? (
        <EmptyState
          icon={<Truck className="w-6 h-6" />}
          title="Aún no tenés proveedores"
          description="Cargá tus proveedores para empezar a registrar compras y pagos."
          action={
            <Link
              href="/admin/proveedores/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Crear primer proveedor
            </Link>
          }
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nombre</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">CUIT</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Rubro</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Contacto</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Plazo</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Saldo</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(proveedores ?? []).map((p) => {
                  const saldo = Number(p.saldo_cta_cte);
                  return (
                    <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/proveedores/${p.id}`}
                          className="font-semibold text-[var(--primary)] hover:underline"
                        >
                          {p.nombre}
                        </Link>
                      </td>
                      <td className="px-5 py-3 mono text-[var(--fg-muted)]">
                        {p.cuit || '-'}
                      </td>
                      <td className="px-5 py-3">
                        {p.rubro ? (
                          <span className="inline-block px-2 py-0.5 bg-[var(--bg-card-2)] rounded-[4px] text-[11px] font-medium">
                            {p.rubro}
                          </span>
                        ) : (
                          <span className="text-[var(--fg-subtle)]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[var(--fg-muted)] text-[12px]">
                        {p.whatsapp || p.telefono || p.email || '-'}
                      </td>
                      <td className="px-5 py-3 text-right text-[12px]">
                        {p.plazo_pago_dias === 0 ? (
                          <span className="text-[var(--green)] font-semibold">Contado</span>
                        ) : (
                          <span className="text-[var(--fg-muted)]">{p.plazo_pago_dias} días</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right mono font-bold">
                        {saldo > 0 ? (
                          <span className="text-[var(--red)]">${formatARS(saldo)}</span>
                        ) : saldo < 0 ? (
                          <span className="text-[var(--green)]">${formatARS(Math.abs(saldo))} a fav.</span>
                        ) : (
                          <span className="text-[var(--fg-subtle)]">$0,00</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {p.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--green-l)] text-[var(--green)] rounded-[4px] text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
                            ACTIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-card-3)] text-[var(--fg-muted)] rounded-[4px] text-[10px] font-bold">
                            INACTIVO
                          </span>
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
