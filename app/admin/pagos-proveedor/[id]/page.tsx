import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Truck, Ban, FileText } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AnularBtn } from './anular-btn';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const formaPagoLabels: Record<string, string> = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  cheque_propio: '📄 Cheque propio',
  cheque_endoso: '🔄 Cheque endosado',
  tarjeta: '💳 Tarjeta',
  otro: '➕ Otro',
};

export default async function PagoDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: pago } = await supabase
    .from('pagos_proveedor')
    .select(`
      *,
      proveedor:proveedores(id, nombre),
      imputaciones:pago_proveedor_imputaciones(*, compra:compras(id, numero_factura, fecha, total, monto_pagado)),
      cheque_emitido:cheques_emitidos(id, numero, banco_propio, fecha_pago),
      cheque_recibido:cheques_recibidos(id, numero, banco, librador)
    `)
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!pago) notFound();

  const numFmt = String(pago.numero).padStart(4, '0');
  const esAdmin = ctx.rol === 'admin_productor';

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Pago #${numFmt}`}
        icon="💸"
        subtitle={pago.proveedor_nombre}
        breadcrumbs={[
          { label: 'Pagos a proveedores', href: '/admin/pagos-proveedor' },
          { label: `#${numFmt}` },
        ]}
        actions={
          esAdmin && !pago.anulado && <AnularBtn id={pago.id} />
        }
      />

      {pago.anulado && (
        <div className="bg-[var(--bg-card-3)] border border-[var(--border-2)] rounded-[12px] p-4 flex items-center gap-3">
          <Ban className="w-5 h-5 text-[var(--fg-muted)]" strokeWidth={2} />
          <div>
            <p className="text-[13px] font-bold text-[var(--fg-muted)]">PAGO ANULADO</p>
            {pago.anulado_en && (
              <p className="text-[11px] text-[var(--fg-subtle)]">
                {formatFecha(pago.anulado_en.slice(0, 10))}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Datos */}
          <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3">
              Datos del pago
            </h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Fecha</dt>
                <dd className="mono">{formatFecha(pago.fecha)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Proveedor</dt>
                <dd>
                  {pago.proveedor ? (
                    <Link href={`/admin/proveedores/${pago.proveedor.id}`} className="text-[var(--primary)] font-semibold hover:underline flex items-center gap-1">
                      <Truck className="w-3 h-3" strokeWidth={2} />
                      {pago.proveedor_nombre}
                    </Link>
                  ) : (
                    pago.proveedor_nombre
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Forma de pago</dt>
                <dd>{formaPagoLabels[pago.forma_pago] ?? pago.forma_pago}</dd>
              </div>
            </dl>

            {pago.cheque_emitido && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--fg-muted)] font-semibold mb-1">Cheque emitido</p>
                <p className="text-[12px]">
                  N° <strong className="mono">{pago.cheque_emitido.numero}</strong> · {pago.cheque_emitido.banco_propio} · Vto {formatFecha(pago.cheque_emitido.fecha_pago)}
                </p>
              </div>
            )}
            {pago.cheque_recibido && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--fg-muted)] font-semibold mb-1">Cheque endosado</p>
                <p className="text-[12px]">
                  N° <strong className="mono">{pago.cheque_recibido.numero}</strong> · {pago.cheque_recibido.banco} · de {pago.cheque_recibido.librador}
                </p>
              </div>
            )}

            {pago.notas && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--fg-muted)] font-semibold mb-1">Notas</p>
                <p className="text-[12px] whitespace-pre-line">{pago.notas}</p>
              </div>
            )}
          </div>

          {/* Imputaciones */}
          <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <div className="px-5 py-3 border-b border-[var(--border)]">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Compras saldadas ({pago.imputaciones?.length ?? 0})
              </h3>
            </div>
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Factura</th>
                  <th className="px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Fecha</th>
                  <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Imputado</th>
                </tr>
              </thead>
              <tbody>
                {(pago.imputaciones ?? []).map((imp: any) => (
                  <tr key={imp.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 mono font-semibold">
                      {imp.compra ? (
                        <Link href={`/admin/compras/${imp.compra.id}`} className="text-[var(--primary)] hover:underline flex items-center gap-1">
                          <FileText className="w-3 h-3" strokeWidth={2} />
                          {imp.compra.numero_factura || '(sin nº)'}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 mono text-[var(--fg-muted)]">
                      {imp.compra ? formatFecha(imp.compra.fecha) : ''}
                    </td>
                    <td className="px-3 py-2 text-right mono font-bold">
                      ${formatARS(Number(imp.importe))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: importe total */}
        <div className="space-y-4">
          <div className="bg-[var(--primary-ll)] border-2 border-[var(--primary)] rounded-[12px] p-5">
            <p className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
              Importe total
            </p>
            <p className="text-[32px] font-bold mono text-[var(--primary)] leading-tight">
              ${formatARS(Number(pago.importe_total))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
