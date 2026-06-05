import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Beef, TrendingUp, TrendingDown, Activity, Plus, FileText, Settings } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

export default async function HaciendaPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  // Stock por categoría (sumando rodeos)
  const { data: categorias } = await supabase
    .from('categorias_hacienda')
    .select('id, nombre, sexo, color, orden')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true)
    .order('orden');

  const { data: stock } = await supabase
    .from('stock_hacienda')
    .select('categoria_id, cantidad, peso_total_kg')
    .eq('productor_id', ctx.productor.id);

  // Agrupar por categoría
  const stockPorCat = new Map<string, { cantidad: number; peso: number }>();
  for (const s of stock ?? []) {
    const ant = stockPorCat.get(s.categoria_id) ?? { cantidad: 0, peso: 0 };
    stockPorCat.set(s.categoria_id, {
      cantidad: ant.cantidad + (s.cantidad ?? 0),
      peso: ant.peso + (Number(s.peso_total_kg) || 0),
    });
  }

  const totalCabezas = Array.from(stockPorCat.values()).reduce((s, x) => s + x.cantidad, 0);
  const totalKg = Array.from(stockPorCat.values()).reduce((s, x) => s + x.peso, 0);

  // Movimientos recientes
  const { data: movsRecientes } = await supabase
    .from('movimientos_hacienda')
    .select('id, tipo, fecha, cantidad, categoria:categorias_hacienda(nombre)')
    .eq('productor_id', ctx.productor.id)
    .eq('anulado', false)
    .order('fecha', { ascending: false })
    .limit(5);

  // KPIs del mes
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const { data: movsMes } = await supabase
    .from('movimientos_hacienda')
    .select('tipo, cantidad')
    .eq('productor_id', ctx.productor.id)
    .eq('anulado', false)
    .gte('fecha', primerDiaMes);

  let entradasMes = 0, salidasMes = 0;
  for (const m of movsMes ?? []) {
    if (m.tipo === 'compra' || m.tipo === 'paricion') entradasMes += m.cantidad;
    else if (m.tipo === 'venta' || m.tipo === 'muerte' || m.tipo === 'consumo') salidasMes += m.cantidad;
  }

  const tipoLabels: Record<string, { label: string; icon: string }> = {
    compra: { label: 'Compra', icon: '🛒' },
    venta: { label: 'Venta', icon: '💰' },
    paricion: { label: 'Parición', icon: '🐂' },
    muerte: { label: 'Muerte', icon: '☠️' },
    consumo: { label: 'Consumo', icon: '🍖' },
    traslado: { label: 'Traslado', icon: '🔀' },
    recategorizacion: { label: 'Recategorización', icon: '🔄' },
  };

  const noHayCategorias = (categorias ?? []).length === 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hacienda"
        icon="🐄"
        subtitle="Rodeo, movimientos y stock de animales"
        actions={
          <div className="flex gap-2">
            <Link href="/admin/hacienda/movimientos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Nuevo movimiento
            </Link>
          </div>
        }
      />

      {noHayCategorias ? (
        <EmptyState
          icon={Beef}
          title="Empezá cargando categorías"
          description="Para arrancar con Hacienda creá las categorías que vas a usar (vacas, vaquillonas, terneros...)."
          action={{ label: 'Ir a configurar', href: '/admin/hacienda/categorias' }}
        />
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total cabezas" value={String(totalCabezas)} icon={Beef} color="primary" />
            <KpiCard label="Peso total" value={`${formatARS(totalKg)} kg`} icon={Activity} color="blue" />
            <KpiCard label="Entradas del mes" value={String(entradasMes)} icon={TrendingUp} color="emerald" />
            <KpiCard label="Salidas del mes" value={String(salidasMes)} icon={TrendingDown} color="red" />
          </div>

          {/* Stock por categoría */}
          <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <div className="px-5 py-3 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Stock por categoría
              </h3>
              <Link href="/admin/hacienda/categorias"
                className="text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1">
                <Settings className="w-3 h-3" strokeWidth={2} />
                Gestionar categorías
              </Link>
            </div>

            {totalCabezas === 0 ? (
              <div className="p-8 text-center text-[var(--fg-muted)] text-[13px]">
                Todavía no hay animales cargados. Registrá tu primer movimiento.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                {(categorias ?? []).map(cat => {
                  const s = stockPorCat.get(cat.id) ?? { cantidad: 0, peso: 0 };
                  if (s.cantidad === 0) return null;
                  return (
                    <div key={cat.id} className="border border-[var(--border)] rounded-[8px] p-3 hover:shadow-md transition">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: cat.color }}></div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                          {cat.nombre}
                        </span>
                      </div>
                      <div className="text-[24px] font-bold mono leading-tight">{s.cantidad}</div>
                      <div className="text-[10px] text-[var(--fg-muted)] mono">
                        {s.peso > 0 ? `${formatARS(s.peso)} kg total` : '-- kg'}
                      </div>
                      <div className="text-[10px] text-[var(--fg-subtle)] mono">
                        {s.peso > 0 ? `≈ ${(s.peso / s.cantidad).toFixed(0)} kg/cabeza` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Últimos movimientos */}
          <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <div className="px-5 py-3 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Últimos movimientos
              </h3>
              <Link href="/admin/hacienda/movimientos"
                className="text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1">
                <FileText className="w-3 h-3" strokeWidth={2} />
                Ver todos
              </Link>
            </div>
            {(movsRecientes ?? []).length === 0 ? (
              <div className="p-8 text-center text-[var(--fg-muted)] text-[13px]">
                Aún no hay movimientos registrados.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <tbody>
                  {(movsRecientes ?? []).map((m: any) => {
                    const t = tipoLabels[m.tipo] ?? { label: m.tipo, icon: '📋' };
                    const cat = Array.isArray(m.categoria) ? m.categoria[0] : m.categoria;
                    return (
                      <tr key={m.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                        <td className="px-5 py-2.5">
                          <Link href={`/admin/hacienda/movimientos/${m.id}`} className="hover:text-[var(--primary)]">
                            <span className="mr-1">{t.icon}</span>
                            <strong>{t.label}</strong>
                          </Link>
                        </td>
                        <td className="px-5 py-2.5 text-[12px]">{cat?.nombre ?? '-'}</td>
                        <td className="px-5 py-2.5 text-right mono font-bold">{m.cantidad} cab.</td>
                        <td className="px-5 py-2.5 text-[12px] text-[var(--fg-muted)] mono text-right">{m.fecha}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
