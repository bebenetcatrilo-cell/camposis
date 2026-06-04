import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wheat, Package, Scale, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

const TIPOS: Record<string, { label: string; icon: string }> = {
  aereo: { label: 'Aéreo', icon: '🏗️' },
  bolsa: { label: 'Silo bolsa', icon: '📦' },
  galpon: { label: 'Galpón', icon: '🏚️' },
  tercero: { label: 'En tercero', icon: '🏢' },
  otro: { label: 'Otro', icon: '📋' },
};

type SP = Promise<{ q?: string; mostrar?: string }>;

export default async function SilosPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const mostrarInactivos = params.mostrar === 'todos';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  let query = supabase.from('silos').select('*').eq('productor_id', ctx.productor.id);
  if (!mostrarInactivos) query = query.eq('activo', true);
  if (q) query = query.or(`nombre.ilike.%${q}%,ubicacion.ilike.%${q}%`);

  const { data: silos } = await query.order('nombre');

  const { data: stockTotal } = await supabase
    .from('stock_silos_total')
    .select('silo_id, stock_total_tn')
    .eq('productor_id', ctx.productor.id);

  const stockMap = new Map(
    (stockTotal ?? []).map((s: { silo_id: string; stock_total_tn: number | null }) => [
      s.silo_id,
      Number(s.stock_total_tn ?? 0),
    ])
  );

  const { data: stockDetalle } = await supabase
    .from('stock_silos')
    .select('*')
    .eq('productor_id', ctx.productor.id);

  type StockRow = {
    silo_id: string;
    producto_nombre: string;
    producto_tipo: string;
    campania: string;
    stock_actual_tn: number;
  };

  const stockPorSilo = new Map<string, StockRow[]>();
  for (const s of (stockDetalle ?? []) as StockRow[]) {
    if (Number(s.stock_actual_tn) > 0) {
      const arr = stockPorSilo.get(s.silo_id) ?? [];
      arr.push(s);
      stockPorSilo.set(s.silo_id, arr);
    }
  }

  const totalSilos = silos?.length ?? 0;
  const stockGlobal = Array.from(stockMap.values()).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Silos"
        icon="🌾"
        subtitle="Stock de cereal por silo y campaña"
        actions={
          <Link
            href="/admin/silos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Nuevo silo
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Silos activos" value={String(totalSilos)} icon={Package} color="primary" />
        <KpiCard
          label="Stock total"
          value={`${stockGlobal.toFixed(2)} tn`}
          icon={Scale}
          color="emerald"
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
            placeholder="Nombre, ubicación..."
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

      {!silos || silos.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title={q ? 'Sin resultados' : 'No tenés silos cargados'}
          description={!q ? 'Creá tu primer silo para empezar a registrar stock.' : undefined}
          action={!q ? { label: '+ Crear el primero', href: '/admin/silos/nuevo' } : undefined}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {silos.map((s) => {
            const tipo = TIPOS[s.tipo] ?? TIPOS.otro;
            const stockTotal = stockMap.get(s.id) ?? 0;
            const productos = stockPorSilo.get(s.id) ?? [];
            const capacidad = s.capacidad_tn ? Number(s.capacidad_tn) : null;
            const porcentaje = capacidad ? Math.min(100, (stockTotal / capacidad) * 100) : null;

            return (
              <Link
                key={s.id}
                href={`/admin/silos/${s.id}`}
                className={`block bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[var(--primary)] transition ${!s.activo ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">
                      {tipo.icon} {s.nombre}
                    </h3>
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                      {tipo.label}
                      {s.ubicacion ? ` · ${s.ubicacion}` : ''}
                    </p>
                  </div>
                  {!s.activo && (
                    <span className="text-xs text-[var(--fg-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded">
                      inactivo
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)] font-semibold">
                      Stock total
                    </span>
                    <span className="text-xl font-extrabold text-[var(--primary)] mono">
                      {stockTotal.toFixed(2)} tn
                    </span>
                  </div>
                  {capacidad && (
                    <>
                      <div className="text-xs text-[var(--fg-muted)] mt-0.5">
                        de {capacidad.toFixed(2)} tn ({porcentaje?.toFixed(0)}%)
                      </div>
                      <div className="mt-2 h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            (porcentaje ?? 0) > 90
                              ? 'bg-red-500'
                              : (porcentaje ?? 0) > 70
                              ? 'bg-amber-500'
                              : 'bg-[var(--primary)]'
                          }`}
                          style={{ width: `${porcentaje ?? 0}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {productos.length > 0 ? (
                  <div className="border-t border-[var(--border)] pt-3 space-y-1">
                    {productos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="truncate">
                          {p.producto_tipo === 'cereal' ? '🌾' : '🐄'} {p.producto_nombre}
                          {p.campania && p.campania !== '—' && (
                            <span className="text-[var(--fg-muted)]"> · {p.campania}</span>
                          )}
                        </span>
                        <span className="font-mono font-semibold ml-2">
                          {Number(p.stock_actual_tn).toFixed(2)} tn
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--fg-muted)] italic pt-3 border-t border-[var(--border)]">
                    Sin stock cargado
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
