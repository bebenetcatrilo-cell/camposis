import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CambiarEstadoFactura } from './cambiar-estado';
import { formatARS, formatFecha } from '@/lib/utils';

const TIPOS: Record<string, { label: string; color: string }> = {
  A: { label: 'Factura A', color: 'bg-blue-100 text-blue-700' },
  B: { label: 'Factura B', color: 'bg-emerald-100 text-emerald-700' },
  C: { label: 'Factura C', color: 'bg-purple-100 text-purple-700' },
  X: { label: 'Recibo X', color: 'bg-gray-100 text-gray-700' },
};

const ESTADOS: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  borrador: { label: 'Borrador', icon: '📝', bg: 'bg-gray-100', text: 'text-gray-700' },
  emitida: { label: 'Emitida', icon: '🧾', bg: 'bg-amber-100', text: 'text-amber-700' },
  cobrada: { label: 'Cobrada', icon: '✓', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  anulada: { label: 'Anulada', icon: '✗', bg: 'bg-red-100', text: 'text-red-700' },
};

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  cheque: '📑 Cheque',
  mercado_pago: '💳 Mercado Pago',
  tarjeta: '💳 Tarjeta',
  otro: '📋 Otro',
};

export default async function FacturaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: fact } = await supabase
    .from('facturas')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!fact) notFound();

  const { data: items } = await supabase
    .from('items_factura')
    .select('*')
    .eq('factura_id', id)
    .order('orden');

  const tipoInfo = TIPOS[fact.tipo] ?? { label: fact.tipo, color: 'bg-gray-100' };
  const est = ESTADOS[fact.estado] ?? ESTADOS.borrador;
  const numeroFmt = `${fact.punto_venta}-${String(fact.numero).padStart(8, '0')}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <Link
          href="/admin/facturas"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a facturas
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1
              className="text-3xl tracking-tight flex items-center gap-3 flex-wrap"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              <span className={`inline-block px-3 py-1 rounded text-base font-bold ${tipoInfo.color}`}>
                {tipoInfo.label}
              </span>
              <span className="font-mono text-2xl">{numeroFmt}</span>
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${est.bg} ${est.text}`}>
                {est.icon} {est.label}
              </span>
            </h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {formatFecha(fact.fecha)} · {fact.cliente_nombre}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <CambiarEstadoFactura id={fact.id} estado={fact.estado} cae={fact.cae} />
            {fact.estado === 'borrador' && (
              <Link
                href={`/admin/facturas/${fact.id}/editar`}
                className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
              >
                ✏️ Editar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Cliente */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
          👤 Cliente
        </h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-bold text-base">{fact.cliente_nombre}</p>
            {fact.cliente_cuit && (
              <p className="text-[var(--fg-muted)]">CUIT: {fact.cliente_cuit}</p>
            )}
            {fact.cliente_condicion_iva && (
              <p className="text-[var(--fg-muted)]">IVA: {fact.cliente_condicion_iva}</p>
            )}
          </div>
          <div>
            {fact.cliente_direccion && <p>{fact.cliente_direccion}</p>}
            {fact.cliente_localidad && (
              <p className="text-[var(--fg-muted)]">{fact.cliente_localidad}</p>
            )}
          </div>
        </div>
        {fact.concepto && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)] font-semibold mb-1">Concepto</p>
            <p className="text-sm">{fact.concepto}</p>
          </div>
        )}
      </div>

      {/* CAE */}
      {(fact.cae || fact.estado === 'emitida') && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-blue-900 mb-2">
            🔢 CAE
          </h2>
          {fact.cae ? (
            <div className="text-sm text-blue-900">
              <p>Nº CAE: <strong className="font-mono">{fact.cae}</strong></p>
              {fact.cae_vencimiento && (
                <p className="text-xs mt-1">Vence: {formatFecha(fact.cae_vencimiento)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-800">
              ⚠️ Falta cargar el CAE. Emití la factura en ARCA y después cargá el número acá.
            </p>
          )}
        </div>
      )}

      {/* Ítems */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)]">
            🛒 Ítems ({items?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
            <tr>
              <th className="px-5 py-2.5 text-left font-semibold">Descripción</th>
              <th className="px-5 py-2.5 text-right font-semibold">Cantidad</th>
              <th className="px-5 py-2.5 text-right font-semibold">P. Unit.</th>
              <th className="px-5 py-2.5 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id} className="border-t border-[var(--border)]">
                <td className="px-5 py-3">{it.descripcion}</td>
                <td className="px-5 py-3 text-right font-mono">
                  {Number(it.cantidad).toFixed(2)} {it.unidad ?? ''}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  ${formatARS(Number(it.precio_unitario))}
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold">
                  ${formatARS(Number(it.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-[var(--border)] p-5 space-y-2 bg-[var(--bg-hover)]">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-semibold">${formatARS(Number(fact.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>IVA ({fact.iva_porcentaje}%)</span>
            <span className="font-semibold">${formatARS(Number(fact.iva_monto))}</span>
          </div>
          <div className="flex justify-between text-lg font-extrabold border-t-2 border-[var(--border)] pt-2">
            <span>TOTAL</span>
            <span className="text-[var(--primary)]">${formatARS(Number(fact.total))}</span>
          </div>
        </div>
      </div>

      {/* Datos de cobro */}
      {fact.estado === 'cobrada' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-900 mb-2">
            ✓ Cobro
          </h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            {fact.forma_pago && (
              <div>
                <p className="text-xs text-[var(--fg-muted)]">Forma de pago</p>
                <p className="font-semibold">{FORMA_PAGO_LABEL[fact.forma_pago] ?? fact.forma_pago}</p>
              </div>
            )}
            {fact.fecha_cobro && (
              <div>
                <p className="text-xs text-[var(--fg-muted)]">Fecha de cobro</p>
                <p className="font-semibold">{formatFecha(fact.fecha_cobro)}</p>
              </div>
            )}
            {fact.observaciones_cobro && (
              <div className="md:col-span-3">
                <p className="text-xs text-[var(--fg-muted)]">Observaciones</p>
                <p className="text-sm">{fact.observaciones_cobro}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Datos de anulación */}
      {fact.estado === 'anulada' && fact.observaciones_cobro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-red-900 mb-1">
            ✗ Motivo de anulación
          </h2>
          <p className="text-sm text-red-800">{fact.observaciones_cobro}</p>
        </div>
      )}

      {/* Notas */}
      {fact.notas && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-2">
            📝 Notas
          </h2>
          <p className="text-sm whitespace-pre-wrap">{fact.notas}</p>
        </div>
      )}

      {/* Presupuesto origen */}
      {fact.presupuesto_id && (
        <div className="text-sm">
          <Link
            href={`/admin/presupuestos/${fact.presupuesto_id}`}
            className="text-[var(--primary)] hover:underline"
          >
            📋 Ver presupuesto de origen →
          </Link>
        </div>
      )}

      {/* Tracking */}
      <div className="text-xs text-[var(--fg-muted)]">
        Creada: {new Date(fact.created_at).toLocaleString('es-AR')}
        {fact.updated_at !== fact.created_at && (
          <> · Modificada: {new Date(fact.updated_at).toLocaleString('es-AR')}</>
        )}
      </div>
    </div>
  );
}
