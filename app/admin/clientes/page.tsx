import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TogglerActivo } from './toggler';
import { formatARS } from '@/lib/utils';

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

  if (tipoFiltro !== 'todos') {
    query = query.eq('tipo', tipoFiltro);
  }
  if (!mostrarInactivos) {
    query = query.eq('activo', true);
  }
  if (q) {
    query = query.or(`nombre.ilike.%${q}%,cuit.ilike.%${q}%,localidad.ilike.%${q}%`);
  }

  const { data: clientes } = await query.order('nombre');

  // KPIs
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

  const saldoTotal = (saldos ?? []).reduce(
    (s, c) => s + (Number(c.saldo_cta_cte) || 0),
    0
  );
  const tePagan = (saldos ?? []).filter((c) => Number(c.saldo_cta_cte) > 0).length;
  const lesDebes = (saldos ?? []).filter((c) => Number(c.saldo_cta_cte) < 0).length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Clientes
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            Acopios, frigoríficos, proveedores y particulares
          </p>
        </div>
        <Link
          href="/admin/clientes/nuevo"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          + Nuevo cliente
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total activos" value={String(total ?? 0)} icon="👥" />
        <Card label="Te deben" value={String(tePagan)} icon="🟢" />
        <Card label="Les debés" value={String(lesDebes)} icon="🔴" />
        <Card
          label="Saldo neto"
          value={formatARS(saldoTotal)}
          icon="💰"
          color={saldoTotal >= 0 ? 'text-emerald-700' : 'text-red-700'}
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

      {/* Tabla */}
      {!clientes || clientes.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
          <div className="text-5xl mb-3">👥</div>
          <h2 className="text-lg font-bold">
            {q || tipoFiltro !== 'todos' ? 'Sin resultados' : 'No tenés clientes cargados'}
          </h2>
          {!q && tipoFiltro === 'todos' && (
            <>
              <p className="text-[var(--fg-muted)] text-sm mt-2 max-w-md mx-auto">
                Cargá tu primer cliente para empezar a registrar operaciones.
              </p>
              <Link
                href="/admin/clientes/nuevo"
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
                  <th className="px-5 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-5 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-5 py-3 text-left font-semibold">CUIT</th>
                  <th className="px-5 py-3 text-left font-semibold">Condición IVA</th>
                  <th className="px-5 py-3 text-left font-semibold">Localidad</th>
                  <th className="px-5 py-3 text-right font-semibold">Saldo</th>
                  <th className="px-5 py-3 text-center font-semibold">Contacto</th>
                  <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const tipo = TIPOS_LABEL[c.tipo] ?? TIPOS_LABEL.otro;
                  const saldo = Number(c.saldo_cta_cte) || 0;
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] ${!c.activo ? 'opacity-50' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/clientes/${c.id}`}
                          className="font-medium hover:text-[var(--primary)]"
                        >
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
                      <td className={`px-5 py-3 text-right font-medium ${saldo > 0 ? 'text-emerald-700' : saldo < 0 ? 'text-red-700' : 'text-[var(--fg-muted)]'}`}>
                        {saldo === 0 ? '—' : formatARS(saldo)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {c.whatsapp && (
                            <a
                              href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener"
                              className="text-[var(--whatsapp)] hover:opacity-70"
                              title={`WhatsApp: ${c.whatsapp}`}
                            >
                              💬
                            </a>
                          )}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="text-blue-600 hover:opacity-70"
                              title={`Email: ${c.email}`}
                            >
                              ✉️
                            </a>
                          )}
                          {c.telefono && (
                            <a
                              href={`tel:${c.telefono}`}
                              className="text-[var(--fg)] hover:opacity-70"
                              title={`Tel: ${c.telefono}`}
                            >
                              📞
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

function Card({
  label,
  value,
  icon,
  color = '',
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
            {label}
          </div>
          <div className={`text-lg font-extrabold mt-0.5 truncate ${color}`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCuit(cuit: string): string {
  if (!cuit || cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}
