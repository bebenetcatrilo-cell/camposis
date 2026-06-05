import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CambiarEstadoFactura } from './cambiar-estado';
import { ImprimirBtn } from './imprimir-btn';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Edit3, FileText, User, Hash, Calendar } from 'lucide-react';

const TIPOS: Record<string, { label: string; color: 'blue' | 'emerald' | 'purple' | 'gray' }> = {
  A: { label: 'Factura A', color: 'blue' },
  B: { label: 'Factura B', color: 'emerald' },
  C: { label: 'Factura C', color: 'purple' },
  X: { label: 'Recibo X', color: 'gray' },
};

const ESTADOS: Record<string, { label: string; icon: string; color: 'gray' | 'amber' | 'emerald' | 'red' }> = {
  borrador: { label: 'Borrador', icon: '📝', color: 'gray' },
  emitida: { label: 'Emitida', icon: '🧾', color: 'amber' },
  cobrada: { label: 'Cobrada', icon: '✓', color: 'emerald' },
  anulada: { label: 'Anulada', icon: '✗', color: 'red' },
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

  const { data: productor } = await supabase
    .from('productores')
    .select('nombre, nombre_campo, cuit, direccion, localidad, provincia, telefono, email_contacto, logo_url, color_primario, condicion_iva_propia')
    .eq('id', ctx.productor.id)
    .single();

  const tipoInfo = TIPOS[fact.tipo] ?? { label: fact.tipo, color: 'gray' as const };
  const est = ESTADOS[fact.estado] ?? ESTADOS.borrador;
  const numeroFmt = `${fact.punto_venta}-${String(fact.numero).padStart(8, '0')}`;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={numeroFmt}
        icon="🧾"
        subtitle={`${formatFecha(fact.fecha)} · ${fact.cliente_nombre}`}
        backHref="/admin/facturas"
        backLabel="Volver a facturas"
        badge={
          <div className="flex gap-2 flex-wrap">
            <StatusBadge label={tipoInfo.label} color={tipoInfo.color} size="md" />
            <StatusBadge label={est.label} icon={est.icon} color={est.color} size="md" />
          </div>
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            {productor && items && (
              <ImprimirBtn factura={fact} items={items} productor={productor} />
            )}
            {(fact.estado === 'emitida' || fact.estado === 'parcial') && fact.cliente_id && (
              <Link
                href={`/admin/cobros/nuevo?cliente_id=${fact.cliente_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--green)] text-white rounded-lg font-semibold hover:opacity-90 transition text-sm"
              >
                💰 Cobrar
              </Link>
            )}
            <CambiarEstadoFactura id={fact.id} estado={fact.estado} cae={fact.cae} />
            {fact.estado === 'borrador' && (
              <Link
                href={`/admin/facturas/${fact.id}/editar`}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
              >
                <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />
                Editar
              </Link>
            )}
          </div>
        }
      />

      {/* Cliente */}
      <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
          <h2 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold">
            Cliente
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-bold text-base">{fact.cliente_nombre}</p>
            {fact.cliente_cuit && (
              <p className="text-[var(--fg-muted)] text-xs mt-1">
                CUIT: <span className="font-mono">{fact.cliente_cuit}</span>
              </p>
            )}
            {fact.cliente_condicion_iva && (
              <p className="text-[var(--fg-muted)] text-xs">
                IVA: {fact.cliente_condicion_iva}
              </p>
            )}
          </div>
          <div>
            {fact.cliente_direccion && <p className="text-sm">{fact.cliente_direccion}</p>}
            {fact.cliente_localidad && (
              <p className="text-[var(--fg-muted)] text-xs">{fact.cliente_localidad}</p>
            )}
          </div>
        </div>
        {fact.concepto && (
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold mb-1">
              Concepto
            </p>
            <p className="text-sm">{fact.concepto}</p>
          </div>
        )}
      </section>

      {/* CAE */}
      {(fact.cae || fact.estado === 'emitida') && (
        <section
          className={`border rounded-2xl p-5 ${
            fact.cae ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Hash className={`w-4 h-4 ${fact.cae ? 'text-blue-700' : 'text-amber-700'}`} strokeWidth={1.8} />
            <h2
              className={`text-[11px] uppercase tracking-[.18em] font-bold ${
                fact.cae ? 'text-blue-900' : 'text-amber-900'
              }`}
            >
              CAE
            </h2>
          </div>
          {fact.cae ? (
            <div className="text-sm text-blue-900">
              <p>
                Nº: <strong className="font-mono">{fact.cae}</strong>
              </p>
              {fact.cae_vencimiento && (
                <p className="text-xs mt-1">Vence: {formatFecha(fact.cae_vencimiento)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-800">
              ⚠️ Falta cargar el CAE. Emití la factura en ARCA y después cargá el número.
            </p>
          )}
        </section>
      )}

      {/* Items */}
      <section className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
          <h2 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold">
            Ítems ({items?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-hover)]">
            <tr>
              <th className="px-5 py-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Descripción
              </th>
              <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Cantidad
              </th>
              <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                P. Unit.
              </th>
              <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id} className="border-t border-[var(--border)]">
                <td className="px-5 py-3">{it.descripcion}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">
                  {Number(it.cantidad).toFixed(2)} {it.unidad ?? ''}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  ${formatARS(Number(it.precio_unitario))}
                </td>
                <td className="px-5 py-3 text-right font-mono font-bold">
                  ${formatARS(Number(it.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-[var(--border)] p-5 space-y-2 bg-[var(--bg-hover)]">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--fg-muted)]">Subtotal</span>
            <span className="font-semibold font-mono">${formatARS(Number(fact.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--fg-muted)]">IVA ({fact.iva_porcentaje}%)</span>
            <span className="font-semibold font-mono">${formatARS(Number(fact.iva_monto))}</span>
          </div>
          <div className="flex justify-between text-xl font-extrabold border-t-2 border-[var(--border)] pt-3 mt-2">
            <span>TOTAL</span>
            <span className="text-[var(--primary)] font-mono">
              ${formatARS(Number(fact.total))}
            </span>
          </div>
        </div>
      </section>

      {/* Datos de cobro */}
      {fact.estado === 'cobrada' && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-700">✓</span>
            <h2 className="text-[11px] uppercase tracking-[.18em] text-emerald-900 font-bold">
              Cobro registrado
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            {fact.forma_pago && (
              <div>
                <p className="text-xs text-emerald-700/70">Forma de pago</p>
                <p className="font-semibold">{FORMA_PAGO_LABEL[fact.forma_pago] ?? fact.forma_pago}</p>
              </div>
            )}
            {fact.fecha_cobro && (
              <div>
                <p className="text-xs text-emerald-700/70">Fecha</p>
                <p className="font-semibold">{formatFecha(fact.fecha_cobro)}</p>
              </div>
            )}
            {fact.observaciones_cobro && (
              <div className="md:col-span-3">
                <p className="text-xs text-emerald-700/70">Observaciones</p>
                <p className="text-sm">{fact.observaciones_cobro}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Anulación */}
      {fact.estado === 'anulada' && fact.observaciones_cobro && (
        <section className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <h2 className="text-[11px] uppercase tracking-[.18em] text-red-900 font-bold mb-1">
            Motivo de anulación
          </h2>
          <p className="text-sm text-red-800">{fact.observaciones_cobro}</p>
        </section>
      )}

      {/* Notas */}
      {fact.notas && (
        <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold mb-2">
            Notas
          </h2>
          <p className="text-sm whitespace-pre-wrap">{fact.notas}</p>
        </section>
      )}

      {/* Presupuesto origen */}
      {fact.presupuesto_id && (
        <div className="text-sm">
          <Link
            href={`/admin/presupuestos/${fact.presupuesto_id}`}
            className="text-[var(--primary)] hover:underline inline-flex items-center gap-1"
          >
            📋 Ver presupuesto de origen →
          </Link>
        </div>
      )}

      {/* Tracking */}
      <div className="text-xs text-[var(--fg-muted)] flex items-center gap-1">
        <Calendar className="w-3 h-3" strokeWidth={1.6} />
        Creada: {new Date(fact.created_at).toLocaleString('es-AR')}
      </div>
    </div>
  );
}
