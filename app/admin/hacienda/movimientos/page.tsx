import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Activity, Plus, Ban } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

const tipoLabels: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  compra:           { label: 'Compra',         icon: '🛒', bg: 'var(--green-l)',  color: 'var(--green)' },
  venta:            { label: 'Venta',          icon: '💰', bg: 'var(--blue-l)',   color: 'var(--blue)' },
  paricion:         { label: 'Parición',       icon: '🐂', bg: 'var(--primary-ll)', color: 'var(--primary)' },
  muerte:           { label: 'Muerte',         icon: '☠️', bg: 'var(--red-l)',    color: 'var(--red)' },
  consumo:          { label: 'Consumo',        icon: '🍖', bg: 'var(--orange-l)', color: 'var(--orange)' },
  traslado:         { label: 'Traslado',       icon: '🔀', bg: 'var(--bg-card-2)', color: 'var(--fg-muted)' },
  recategorizacion: { label: 'Recategorización', icon: '🔄', bg: 'var(--bg-card-2)', color: 'var(--fg-muted)' },
};

type SearchParams = Promise<{ tipo?: string }>;

export default async function MovimientosHaciendaPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const params = await searchParams;
  const tipoFiltro = params.tipo ?? 'todos';

  const supabase = await createClient();

  let query = supabase
    .from('movimientos_hacienda')
    .select(`
      id, tipo, fecha, cantidad, peso_promedio_kg, peso_total_kg, importe_total,
      proveedor_nombre, cliente_nombre, anulado,
      categoria:categorias_hacienda!movimientos_hacienda_categoria_id_fkey(nombre),
      categoria_destino:categorias_hacienda!movimientos_hacienda_categoria_destino_id_fkey(nombre)
    `)
    .eq('productor_id', ctx.productor.id)
    .order('fecha', { ascending: false });

  if (tipoFiltro !== 'todos') query = query.eq('tipo', tipoFiltro);

  const { data: movs } = await query;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Movimientos de hacienda"
        icon="📋"
        breadcrumbs={[
          { label: 'Hacienda', href: '/admin/hacienda' },
          { label: 'Movimientos' },
        ]}
        actions={
          <Link href="/admin/hacienda/movimientos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuevo movimiento
          </Link>
        }
      />

      {/* Filtro de tipo */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-3 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex gap-1 flex-wrap">
          {[
            { v: 'todos', l: 'Todos', i: '📋' },
            ...Object.entries(tipoLabels).map(([v, x]) => ({ v, l: x.label, i: x.icon })),
          ].map(t => (
            <Link key={t.v} href={`/admin/hacienda/movimientos${t.v === 'todos' ? '' : '?tipo=' + t.v}`}
              className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition ${
                tipoFiltro === t.v ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}>
              {t.i} {t.l}
            </Link>
          ))}
        </div>
      </div>

      {!movs || movs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={tipoFiltro !== 'todos' ? 'Sin resultados' : 'Aún no tenés movimientos'}
          description={tipoFiltro !== 'todos' ? 'Probá con otro filtro' : 'Registrá tu primer movimiento de hacienda.'}
          action={tipoFiltro === 'todos' ? { label: '+ Nuevo movimiento', href: '/admin/hacienda/movimientos/nuevo' } : undefined}
        />
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--bg-hover)]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Tipo</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Categoría</th>
                <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cant.</th>
                <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Peso (kg)</th>
                <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Importe</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Contraparte</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m: any) => {
                const t = tipoLabels[m.tipo] ?? { label: m.tipo, icon: '📋', bg: '#eee', color: '#333' };
                const cat = Array.isArray(m.categoria) ? m.categoria[0] : m.categoria;
                const catDest = Array.isArray(m.categoria_destino) ? m.categoria_destino[0] : m.categoria_destino;
                return (
                  <tr key={m.id} className={`border-t border-[var(--border)] hover:bg-[var(--bg-hover)] ${m.anulado ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/hacienda/movimientos/${m.id}`}>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold" style={{ background: t.bg, color: t.color }}>
                          {t.icon} {t.label}
                          {m.anulado && <Ban className="w-3 h-3 ml-1" strokeWidth={2.5} />}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 mono text-[12px]">{formatFecha(m.fecha)}</td>
                    <td className="px-4 py-2.5 text-[12px]">
                      {cat?.nombre ?? '-'}
                      {catDest && <span className="text-[var(--fg-subtle)]"> → {catDest.nombre}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right mono font-bold">{m.cantidad}</td>
                    <td className="px-4 py-2.5 text-right mono text-[12px]">
                      {m.peso_total_kg ? formatARS(Number(m.peso_total_kg)) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right mono font-semibold">
                      {m.importe_total ? `$${formatARS(Number(m.importe_total))}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--fg-muted)]">
                      {m.proveedor_nombre || m.cliente_nombre || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
