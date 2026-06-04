import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, Wheat, Beef, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { TogglerActivo as TogglerActivoProducto } from './toggler';

type SP = Promise<{ tipo?: string; q?: string; mostrar?: string }>;

export default async function ProductosPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const tipo = params.tipo ?? 'cereal';
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

  if (!mostrarInactivos) query = query.eq('activo', true);
  if (q) query = query.or(`nombre.ilike.%${q}%,especie.ilike.%${q}%,variedad.ilike.%${q}%,categoria.ilike.%${q}%,raza.ilike.%${q}%`);

  const { data: productos } = await query.order('nombre');

  // KPIs por tipo
  const { count: totalCereal } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', ctx.productor.id)
    .eq('tipo', 'cereal')
    .eq('activo', true);

  const { count: totalHacienda } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', ctx.productor.id)
    .eq('tipo', 'hacienda')
    .eq('activo', true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        icon="📦"
        subtitle="Catálogo de cereales y hacienda"
        actions={
          <Link
            href={`/admin/productos/nuevo?tipo=${tipo}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Nuevo producto
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Cereales" value={String(totalCereal ?? 0)} icon={Wheat} color="amber" />
        <KpiCard label="Hacienda" value={String(totalHacienda ?? 0)} icon={Beef} color="red" />
        <KpiCard
          label="Total catálogo"
          value={String((totalCereal ?? 0) + (totalHacienda ?? 0))}
          icon={Package}
          color="primary"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <Link
          href="/admin/productos?tipo=cereal"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            tipo === 'cereal'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent hover:text-[var(--primary)]'
          }`}
        >
          🌾 Cereales
        </Link>
        <Link
          href="/admin/productos?tipo=hacienda"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            tipo === 'hacienda'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent hover:text-[var(--primary)]'
          }`}
        >
          🐄 Hacienda
        </Link>
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
            placeholder={tipo === 'cereal' ? 'Soja, trigo, variedad...' : 'Ternero, novillo, raza...'}
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
            <option value="todos">Todos</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
      </form>

      {!productos || productos.length === 0 ? (
        <EmptyState
          icon={tipo === 'cereal' ? Wheat : Beef}
          title={
            q ? 'Sin resultados' : `No tenés ${tipo === 'cereal' ? 'cereales' : 'hacienda'} cargada`
          }
          description={
            !q ? `Agregá tu primer producto ${tipo === 'cereal' ? 'de cereal' : 'de hacienda'}.` : undefined
          }
          action={!q ? { label: '+ Crear primero', href: `/admin/productos/nuevo?tipo=${tipo}` } : undefined}
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nombre</th>
                  {tipo === 'cereal' ? (
                    <>
                      <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Especie</th>
                      <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Variedad</th>
                      <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Campaña</th>
                    </>
                  ) : (
                    <>
                      <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Categoría</th>
                      <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Raza</th>
                      <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Sexo</th>
                    </>
                  )}
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Unidad</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition ${!p.activo ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <Link href={`/admin/productos/${p.id}`} className="font-medium hover:text-[var(--primary)]">
                        {p.nombre}
                      </Link>
                    </td>
                    {tipo === 'cereal' ? (
                      <>
                        <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{p.especie ?? '—'}</td>
                        <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{p.variedad ?? '—'}</td>
                        <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{p.campania ?? '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{p.categoria ?? '—'}</td>
                        <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{p.raza ?? '—'}</td>
                        <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">{p.sexo ?? '—'}</td>
                      </>
                    )}
                    <td className="px-5 py-3 text-xs font-mono">{p.unidad}</td>
                    <td className="px-5 py-3 text-right">
                      <TogglerActivoProducto id={p.id} activo={p.activo} />
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
