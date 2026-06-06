import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, TrendingUp, TrendingDown, Wallet, Plus, MessageCircle, Mail, Phone } from 'lucide-react';
import { TogglerActivo } from './toggler';
import { RecalcularSaldosBtn } from './recalcular-btn';
import { formatARS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

type SearchParams = Promise<{
  tipo?: string;
  q?: string;
  mostrar?: string;
}>;

const TIPOS_LABEL: Record<string, { label: string; icon: string }> = {
  acopio: { label: 'Acopio', icon: '🌾' },
  frigorifico: { label: 'Frigorífico', icon: '🐄' },
  proveedor: { label: 'Proveedor', icon: '🚜' },
  particular: { label: 'Particular', icon: '👤' },
  otro: { label: 'Otro', icon: '📋' },
};

const IVA_LABEL: Record<string, string> = {
  ri: 'Resp. Inscripto',
  monotributo: 'Monotributo',
  exento: 'Exento',
  consumidor_final: 'Consumidor final',
  no_categorizado: 'No categorizado',
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tipoFiltro = params.tipo ?? 'todos';
  const q = params.q?.trim() ?? '';
  const mostrarInactivos = params.mostrar === 'todos';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  let query = supabase
    .from('clientes')
    .select('*')
    .eq('productor_id', ctx.productor.id);

  if (tipoFiltro !== 'todos') query = query.eq('tipo', tipoFiltro);
  if (!mostrarInactivos) query = query.eq('activo', true);
  if (q) query = query.or(`nombre.ilike.%${q}%,cuit.ilike.%${q}%,localidad.ilike.%${q}%`);

  const { data: clientes } = await query.order('nombre');

  const { count: total } = await supabase
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true);

  const { data: saldos } = await supabase
    .from('clientes')
    .select('saldo_cta_cte')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true);

  const saldoTotal = (saldos ?? []).reduce((s, c) => s + (Number(c.saldo_cta_cte) || 0), 0);
  const tePagan = (saldos ?? []).filter((c) => Number(c.saldo_cta_cte) > 0).length;
  const lesDebes = (saldos ?? []).filter((c) => Number(c.saldo_cta_cte) < 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        icon="👥"
        subtitle="Acopios, frigoríficos, proveedores y particulares"
        actions={
          <div className="flex gap-2 flex-wrap">
            {ctx.rol === 'admin_productor' && <RecalcularSaldosBtn />}
            <Link
              href="/admin/clientes/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} />
              Nuevo cliente
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total activos" value={String(total ?? 0)} icon={Users} color="primary" />
        <KpiCard label="Te deben" value={String(tePagan)} icon={TrendingUp} color="red" />
        <KpiCard label="Les debés" value={String(lesDebes)} icon={TrendingDown} color="amber" />
        <KpiCard
          label="Saldo neto"
          value={`$${formatARS(Math.abs(saldoTotal))}`}
          icon={Wallet}
          color={saldoTotal >= 0 ? 'emerald' : 'red'}
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
            placeholder="Nombre, CUIT, localidad..."
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Tipo
          </label>
          <select
            name="tipo"
            defaultValue={tipoFiltro}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="acopio">🌾 Acopio</option>
            <option value="frigorifico">🐄 Frigorífico</option>
            <option value="proveedor">🚜 Proveedor</option>
            <option value="particular">👤 Particular</option>
            <option value="otro">📋 Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Mostrar
          </label>
          <select
            name="mostrar"
            defaultValue={mostrarInactivos ? 'todos' : 'activos'}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="activos">Solo activos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
        {(q || tipoFiltro !== 'todos' || mostrarInactivos) && (
          <Link
            href="/admin/clientes"
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Limpiar
          </Link>
        )}
      </form>

      {!clientes || clientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            q || tipoFiltro !== 'todos' ? 'Sin resultados' : 'No tenés clientes cargados'
          }
          description={
            !q && tipoFiltro === 'todos'
              ? 'Cargá tu primer cliente para empezar a registrar operaciones.'
              : undefined
          }
          action={
            !q && tipoFiltro === 'todos'
              ? { label: '+ Crear el primero', href: '/admin/clientes/nuevo' }
              : undefined
          }
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cliente</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Tipo</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">CUIT</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Condición IVA</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Localidad</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Saldo</th>
                  <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Contacto</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const tipo = TIPOS_LABEL[c.tipo] ?? TIPOS_LABEL.otro;
                  const saldo = Number(c.saldo_cta_cte) || 0;
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition ${!c.activo ? 'opacity-50' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:text-[var(--primary)]">
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs">{tipo.icon} {tipo.label}</span>
                      </td>
                      <td className="px-5 py-3 text-[var(--fg-muted)] font-mono text-xs">
                        {c.cuit ? formatCuit(c.cuit) : '—'}
                      </td>
                      <td className="px-5 py-3 text-[var(--fg-muted)] text-xs">
                        {IVA_LABEL[c.condicion_iva] ?? c.condicion_iva}
                      </td>
                      <td className="px-5 py-3 text-[var(--fg-muted)]">
                        {c.localidad ?? '—'}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold mono ${
                          saldo > 0
                            ? 'text-red-700'
                            : saldo < 0
                            ? 'text-emerald-700'
                            : 'text-[var(--fg-muted)]'
                        }`}
                      >
                        {saldo === 0 ? '—' : `$${formatARS(Math.abs(saldo))}`}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          {c.whatsapp && (
                            <a
                              href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener"
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 grid place-items-center transition"
                              title={`WhatsApp: ${c.whatsapp}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-700" strokeWidth={2} />
                            </a>
                          )}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 grid place-items-center transition"
                              title={`Email: ${c.email}`}
                            >
                              <Mail className="w-3.5 h-3.5 text-blue-700" strokeWidth={2} />
                            </a>
                          )}
                          {c.telefono && (
                            <a
                              href={`tel:${c.telefono}`}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 grid place-items-center transition"
                              title={`Tel: ${c.telefono}`}
                            >
                              <Phone className="w-3.5 h-3.5 text-gray-700" strokeWidth={2} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <TogglerActivo id={c.id} activo={c.activo} />
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

function formatCuit(cuit: string): string {
  if (!cuit || cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}
