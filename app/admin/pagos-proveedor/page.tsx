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

const formaPagoLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque_propio: 'Cheque propio',
  cheque_endoso: 'Cheque endosado',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

type SearchParams = Promise<{ q?: string; estado?: string }>;

export default async function PagosProveedorPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const estadoFiltro = params.estado ?? 'activos';

  const supabase = await createClient();

  let query = supabase
    .from('pagos_proveedor')
    .select('id, numero, fecha, proveedor_nombre, importe_total, forma_pago, anulado')
    .eq('productor_id', ctx.productor.id)
    .order('fecha', { ascending: false });

  if (estadoFiltro === 'activos') query = query.eq('anulado', false);
  if (estadoFiltro === 'anulados') query = query.eq('anulado', true);
  if (q) query = query.ilike('proveedor_nombre', `%${q}%`);

  const { data: pagos } = await query;

  // KPIs
  const { data: todos } = await supabase
    .from('pagos_proveedor')
    .select('importe_total, fecha, anulado')
    .eq('productor_id', ctx.productor.id);

  const totalPagos = (todos ?? []).filter(p => !p.anulado).length;
  const totalImporte = (todos ?? []).filter(p => !p.anulado).reduce((s, p) => s + Number(p.importe_total), 0);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const pagadosMes = (todos ?? [])
    .filter(p => !p.anulado && p.fecha >= primerDiaMes)
    .reduce((s, p) => s + Number(p.importe_total), 0);
  const pagosMesCount = (todos ?? []).filter(p => !p.anulado && p.fecha >= primerDiaMes).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pagos a proveedores"
        icon="💸"
        subtitle="Historial de pagos realizados a proveedores"
        actions={
          <Link
            href="/admin/pagos-proveedor/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuevo pago
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Pagos totales" value={String(totalPagos)} icon={Wallet} color="primary" />
        <KpiCard label="Importe total" value={`$${formatARS(totalImporte)}`} icon={DollarSign} color="blue" />
        <KpiCard label="Pagos del mes" value={String(pagosMesCount)} icon={Calendar} color="emerald" />
        <KpiCard label="Pagado este mes" value={`$${formatARS(pagadosMes)}`} icon={DollarSign} color="emerald" />
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">Buscar</label>
            <input type="text" name="q" defaultValue={q} placeholder="Nombre del proveedor..."
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

      {!pagos || pagos.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={q ? 'Sin resultados' : 'No tenés pagos registrados'}
          description={!q ? 'Registrá tu primer pago para empezar a saldar cuentas con tus proveedores.' : 'Probá cambiar los filtros.'}
          action={!q ? { label: '+ Registrar primer pago', href: '/admin/pagos-proveedor/nuevo' } : undefined}
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nº</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Proveedor</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Forma pago</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Importe</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id} className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition ${p.anulado ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3 mono font-semibold">
                      <Link href={`/admin/pagos-proveedor/${p.id}`} className="text-[var(--primary)] hover:underline">
                        #{String(p.numero).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-5 py-3 mono text-[12px]">{formatFecha(p.fecha)}</td>
                    <td className="px-5 py-3">{p.proveedor_nombre}</td>
                    <td className="px-5 py-3 text-[12px] text-[var(--fg-muted)]">
                      {formaPagoLabels[p.forma_pago] ?? p.forma_pago}
                    </td>
                    <td className="px-5 py-3 text-right mono font-bold">
                      ${formatARS(Number(p.importe_total))}
                    </td>
                    <td className="px-5 py-3">
                      {p.anulado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-card-3)] text-[var(--fg-muted)] rounded-[4px] text-[10px] font-bold">
                          <Ban className="w-3 h-3" strokeWidth={2.5} />
                          ANULADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--green-l)] text-[var(--green)] rounded-[4px] text-[10px] font-bold">
                          ✅ ACTIVO
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
