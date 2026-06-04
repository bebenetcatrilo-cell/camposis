import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatARS, formatFecha } from '@/lib/utils';

type SearchParams = Promise<{ q?: string; estado?: string; plan?: string }>;

export default async function ProductoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const estado = params.estado ?? '';
  const plan = params.plan ?? '';

  const supabase = await createClient();

  let query = supabase
    .from('productores')
    .select('*')
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,slug.ilike.%${q}%,email_contacto.ilike.%${q}%,nombre_campo.ilike.%${q}%`);
  }
  if (estado) {
    query = query.eq('estado_suscripcion', estado);
  }
  if (plan) {
    query = query.eq('plan', plan);
  }

  const { data: productores } = await query;

  // Stats
  const totalQ = await supabase
    .from('productores')
    .select('id, estado_suscripcion, activa', { count: 'exact', head: false });
  const total = totalQ.count ?? 0;
  const activos = (totalQ.data ?? []).filter(
    (p) => p.activa && p.estado_suscripcion === 'activa'
  ).length;
  const vencidos = (totalQ.data ?? []).filter(
    (p) => p.estado_suscripcion === 'vencida'
  ).length;
  const suspendidos = (totalQ.data ?? []).filter(
    (p) => p.estado_suscripcion === 'suspendida'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Productores
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            {total} clientes en el sistema · {activos} activos · {vencidos} vencidos · {suspendidos} suspendidos
          </p>
        </div>
        <Link
          href="/super-admin/productores/nuevo"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          + Nuevo productor
        </Link>
      </header>

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
            placeholder="Nombre, slug, email, campo..."
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
            <option value="">Todos</option>
            <option value="activa">Activa</option>
            <option value="vencida">Vencida</option>
            <option value="suspendida">Suspendida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Plan
          </label>
          <select
            name="plan"
            defaultValue={plan}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="trial">Trial</option>
            <option value="basico">Básico</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
        {(q || estado || plan) && (
          <Link
            href="/super-admin/productores"
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla / Empty state */}
      {!productores || productores.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
          <div className="text-5xl mb-3">🌾</div>
          <h2 className="text-lg font-bold">
            {q || estado || plan
              ? 'Sin resultados con esos filtros'
              : 'Todavía no hay productores'}
          </h2>
          {!q && !estado && !plan && (
            <>
              <p className="text-[var(--fg-muted)] text-sm mt-2 max-w-md mx-auto">
                Cuando cierres tu primera venta, creá el productor desde acá.
              </p>
              <Link
                href="/super-admin/productores/nuevo"
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
            <table className="w-full">
              <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-5 py-3 text-left font-semibold">URL</th>
                  <th className="px-5 py-3 text-left font-semibold">Email</th>
                  <th className="px-5 py-3 text-left font-semibold">Plan</th>
                  <th className="px-5 py-3 text-left font-semibold">Estado</th>
                  <th className="px-5 py-3 text-left font-semibold">Próx. pago</th>
                </tr>
              </thead>
              <tbody>
                {productores.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/super-admin/productores/${p.id}`}
                        className="font-medium hover:text-[var(--primary)] block"
                      >
                        {p.nombre}
                      </Link>
                      {p.nombre_campo && (
                        <div className="text-xs text-[var(--fg-muted)]">
                          🌾 {p.nombre_campo}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-[var(--fg-muted)]">
                      <a
                        href={`https://${p.slug}.camposis.bbnetsystem.com`}
                        target="_blank"
                        rel="noopener"
                        className="hover:text-[var(--primary)]"
                      >
                        {p.slug}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-sm">{p.email_contacto}</td>
                    <td className="px-5 py-3 text-sm capitalize">{p.plan}</td>
                    <td className="px-5 py-3 text-sm">
                      <EstadoBadge estado={p.estado_suscripcion} />
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--fg-muted)]">
                      {formatFecha(p.proximo_pago)}
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

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    activa: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    vencida: { bg: 'bg-amber-100', text: 'text-amber-700' },
    suspendida: { bg: 'bg-red-100', text: 'text-red-700' },
    cancelada: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };
  const c = map[estado] ?? map.cancelada;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${c.bg} ${c.text}`}
    >
      {estado}
    </span>
  );
}
