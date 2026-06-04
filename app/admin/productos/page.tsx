import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TogglerActivo } from './toggler';

type SearchParams = Promise<{ tipo?: string; q?: string; mostrar?: string }>;

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tipo = (params.tipo === 'hacienda' ? 'hacienda' : 'cereal') as 'cereal' | 'hacienda';
  const q = params.q?.trim() ?? '';
  const mostrarInactivos = params.mostrar === 'todos';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  let query = supabase
    .from('productos')
    .select('*')
    .eq('productor_id', ctx.productor.id)
    .eq('tipo', tipo);

  if (!mostrarInactivos) {
    query = query.eq('activo', true);
  }

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,especie.ilike.%${q}%,categoria.ilike.%${q}%,raza.ilike.%${q}%`);
  }

  const { data: productos } = await query.order('nombre');

  // Count totales
  const { count: totalCereal } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', ctx.productor.id)
    .eq('tipo', 'cereal');

  const { count: totalHacienda } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', ctx.productor.id)
    .eq('tipo', 'hacienda');

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Productos
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            Cereal y hacienda que comercializás
          </p>
        </div>
        <Link
          href={`/admin/productos/nuevo?tipo=${tipo}`}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          + Nuevo {tipo === 'cereal' ? 'cereal' : 'animal'}
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        <TabLink
          href={`/admin/productos?tipo=cereal${q ? `&q=${q}` : ''}${mostrarInactivos ? '&mostrar=todos' : ''}`}
          active={tipo === 'cereal'}
        >
          🌾 Cereal ({totalCereal ?? 0})
        </TabLink>
        <TabLink
          href={`/admin/productos?tipo=hacienda${q ? `&q=${q}` : ''}${mostrarInactivos ? '&mostrar=todos' : ''}`}
          active={tipo === 'hacienda'}
        >
          🐄 Hacienda ({totalHacienda ?? 0})
        </TabLink>
      </div>

      {/* Filtros */}
      <form
        method="get"
        className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <input type="hidden" name="tipo" value={tipo} />
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Buscar
          </label>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={tipo === 'cereal' ? 'Soja, trigo, maíz...' : 'Ternero, novillo, vaca...'}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
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
            <option value="todos">Todos (incluye inactivos)</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
        {(q || mostrarInactivos) && (
          <Link
            href={`/admin/productos?tipo=${tipo}`}
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      {!productos || productos.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
          <div className="text-5xl mb-3">{tipo === 'cereal' ? '🌾' : '🐄'}</div>
          <h2 className="text-lg font-bold">
            {q ? 'Sin resultados' : `No tenés productos de ${tipo}`}
          </h2>
          {!q && (
            <>
              <p className="text-[var(--fg-muted)] text-sm mt-2 max-w-md mx-auto">
                El catálogo se carga automáticamente al crear el productor.
                Si no ves nada acá, podés agregar manualmente.
              </p>
              <Link
                href={`/admin/productos/nuevo?tipo=${tipo}`}
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
                  <th className="px-5 py-3 text-left font-semibold">Nombre</th>
                  {tipo === 'cereal' ? (
                    <>
                      <th className="px-5 py-3 text-left font-semibold">Especie</th>
                      <th className="px-5 py-3 text-left font-semibold">Variedad</th>
                      <th className="px-5 py-3 text-left font-semibold">Campaña</th>
                      <th className="px-5 py-3 text-left font-semibold">Grado</th>
                    </>
                  ) : (
                    <>
                      <th className="px-5 py-3 text-left font-semibold">Categoría</th>
                      <th className="px-5 py-3 text-left font-semibold">Raza</th>
                      <th className="px-5 py-3 text-left font-semibold">Sexo</th>
                      <th className="px-5 py-3 text-left font-semibold">Edad/Peso</th>
                    </>
                  )}
                  <th className="px-5 py-3 text-left font-semibold">Unidad</th>
                  <th className="px-5 py-3 text-left font-semibold">Estado</th>
                  <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] ${!p.activo ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/productos/${p.id}`}
                        className="font-medium hover:text-[var(--primary)]"
                      >
                        {p.nombre}
                      </Link>
                    </td>
                    {tipo === 'cereal' ? (
                      <>
                        <td className="px-5 py-3 text-[var(--fg-muted)]">{p.especie ?? '—'}</td>
                        <td className="px-5 py-3 text-[var(--fg-muted)]">{p.variedad ?? '—'}</td>
                        <td className="px-5 py-3 text-[var(--fg-muted)]">{p.campania ?? '—'}</td>
                        <td className="px-5 py-3 text-[var(--fg-muted)]">{p.grado ?? '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-[var(--fg-muted)]">{p.categoria ?? '—'}</td>
                        <td className="px-5 py-3 text-[var(--fg-muted)]">{p.raza ?? '—'}</td>
                        <td className="px-5 py-3 text-[var(--fg-muted)] capitalize">{p.sexo ?? '—'}</td>
                        <td className="px-5 py-3 text-[var(--fg-muted)] text-xs">
                          {p.edad_aprox_meses && `${p.edad_aprox_meses}m`}
                          {p.edad_aprox_meses && p.peso_promedio_kg && ' · '}
                          {p.peso_promedio_kg && `${p.peso_promedio_kg}kg`}
                          {!p.edad_aprox_meses && !p.peso_promedio_kg && '—'}
                        </td>
                      </>
                    )}
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 bg-[var(--bg-hover)] rounded text-xs font-mono">
                        {p.unidad}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {p.activo ? (
                        <span className="text-emerald-600 text-xs">✓ Activo</span>
                      ) : (
                        <span className="text-[var(--fg-muted)] text-xs">○ Inactivo</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <TogglerActivo id={p.id} activo={p.activo} />
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

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? 'border-[var(--primary)] text-[var(--primary)]'
          : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
      }`}
    >
      {children}
    </Link>
  );
}
