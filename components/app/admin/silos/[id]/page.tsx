import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { EliminarMovimientoBoton } from './eliminar-movimiento';
import { formatFecha } from '@/lib/utils';

const TIPOS: Record<string, { label: string; icon: string }> = {
  aereo: { label: 'Aéreo', icon: '🏗️' },
  bolsa: { label: 'Silo bolsa', icon: '📦' },
  galpon: { label: 'Galpón', icon: '🏚️' },
  tercero: { label: 'En tercero', icon: '🏢' },
  otro: { label: 'Otro', icon: '📋' },
};

export default async function SiloDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: silo } = await supabase
    .from('silos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!silo) notFound();

  // Stock por producto × campaña
  const { data: stock } = await supabase
    .from('stock_silos')
    .select('*')
    .eq('silo_id', id)
    .eq('productor_id', ctx.productor.id);

  // Stock total
  const stockTotal = (stock ?? []).reduce(
    (s, r) => s + (Number(r.stock_actual_tn) || 0),
    0
  );

  // Historial de movimientos
  const { data: movimientos } = await supabase
    .from('movimientos_silo')
    .select(`
      id, tipo, cantidad_tn, campania, fecha, observaciones, created_at,
      producto:productos!movimientos_silo_producto_id_fkey(id, nombre, tipo)
    `)
    .eq('silo_id', id)
    .eq('productor_id', ctx.productor.id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const tipo = TIPOS[silo.tipo] ?? TIPOS.otro;
  const capacidad = silo.capacidad_tn ? Number(silo.capacidad_tn) : null;
  const porcentaje = capacidad ? Math.min(100, (stockTotal / capacidad) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <Link
          href="/admin/silos"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a silos
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1
              className="text-3xl tracking-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {tipo.icon} {silo.nombre}
            </h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {tipo.label}{silo.ubicacion ? ` · ${silo.ubicacion}` : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/admin/silos/${silo.id}/movimiento`}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
            >
              + Registrar movimiento
            </Link>
            <Link
              href={`/admin/silos/${silo.id}/editar`}
              className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
            >
              ✏️ Editar
            </Link>
          </div>
        </div>
      </header>

      {/* Stock total */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)] font-semibold">
              Stock total en este silo
            </p>
            <p className="text-3xl font-extrabold text-[var(--primary)] mt-1">
              {stockTotal.toFixed(2)} tn
            </p>
          </div>
          {capacidad && (
            <div className="text-right">
              <p className="text-sm text-[var(--fg-muted)]">
                Capacidad: <strong>{capacidad.toFixed(2)} tn</strong>
              </p>
              <p className={`text-sm font-semibold ${
                (porcentaje ?? 0) > 90 ? 'text-red-700'
                : (porcentaje ?? 0) > 70 ? 'text-amber-700'
                : 'text-emerald-700'
              }`}>
                {porcentaje?.toFixed(0)}% lleno
              </p>
            </div>
          )}
        </div>
        {capacidad && (
          <div className="mt-3 h-3 bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                (porcentaje ?? 0) > 90 ? 'bg-red-500'
                : (porcentaje ?? 0) > 70 ? 'bg-amber-500'
                : 'bg-[var(--primary)]'
              }`}
              style={{ width: `${porcentaje ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Stock por producto / campaña */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)]">
            📊 Stock detallado
          </h2>
        </div>
        {!stock || stock.length === 0 ? (
          <div className="p-8 text-center text-[var(--fg-muted)]">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-sm">Sin stock cargado en este silo</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Producto</th>
                <th className="px-5 py-2.5 text-left font-semibold">Campaña</th>
                <th className="px-5 py-2.5 text-right font-semibold">Stock</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="px-5 py-2.5">
                    {s.producto_tipo === 'cereal' ? '🌾' : '🐄'} {s.producto_nombre}
                  </td>
                  <td className="px-5 py-2.5 text-[var(--fg-muted)]">
                    {s.campania && s.campania !== '—' ? s.campania : '—'}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono font-semibold">
                    {Number(s.stock_actual_tn).toFixed(2)} tn
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Historial movimientos */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)]">
            📜 Últimos movimientos
          </h2>
          <span className="text-xs text-[var(--fg-muted)]">
            {movimientos?.length ?? 0} registrados
          </span>
        </div>
        {!movimientos || movimientos.length === 0 ? (
          <div className="p-8 text-center text-[var(--fg-muted)]">
            <p className="text-sm">Aún no hay movimientos.</p>
            <Link
              href={`/admin/silos/${silo.id}/movimiento`}
              className="inline-block mt-3 text-sm text-[var(--primary)] hover:underline"
            >
              + Registrar el primero
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Fecha</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Tipo</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Producto</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Campaña</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Cantidad</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Notas</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m: any) => {
                  const producto = Array.isArray(m.producto) ? m.producto[0] : m.producto;
                  return (
                    <tr key={m.id} className="border-t border-[var(--border)]">
                      <td className="px-5 py-2.5 text-xs">{formatFecha(m.fecha)}</td>
                      <td className="px-5 py-2.5">
                        {m.tipo === 'entrada' ? (
                          <span className="text-emerald-700 text-xs font-semibold">↗ Entrada</span>
                        ) : (
                          <span className="text-red-700 text-xs font-semibold">↘ Salida</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-xs">
                        {producto?.nombre ?? '—'}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-[var(--fg-muted)]">
                        {m.campania ?? '—'}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-mono font-semibold ${
                        m.tipo === 'entrada' ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {m.tipo === 'entrada' ? '+' : '-'}{Number(m.cantidad_tn).toFixed(2)} tn
                      </td>
                      <td className="px-5 py-2.5 text-xs text-[var(--fg-muted)] max-w-[200px] truncate">
                        {m.observaciones ?? '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <EliminarMovimientoBoton movimientoId={m.id} siloId={silo.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {silo.observaciones && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-2">
            📝 Observaciones
          </h2>
          <p className="text-sm whitespace-pre-wrap">{silo.observaciones}</p>
        </div>
      )}
    </div>
  );
}
