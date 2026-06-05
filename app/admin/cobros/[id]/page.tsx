import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Ban, FileText } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AnularBtn } from './anular-btn';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const formaCobroLabels: Record<string, string> = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  cheque_recibido: '📄 Cheque',
  tarjeta: '💳 Tarjeta',
  otro: '➕ Otro',
};

export default async function CobroDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: cobro } = await supabase
    .from('cobros')
    .select(`
      *,
      cliente:clientes(id, nombre),
      imputaciones:cobro_imputaciones(*, factura:facturas(id, tipo, punto_venta, numero, fecha)),
      cheque_recibido:cheques_recibidos(id, numero, banco_emisor, fecha_cobro, librador)
    `)
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cobro) notFound();

  const numFmt = String(cobro.numero).padStart(4, '0');
  const esAdmin = ctx.rol === 'admin_productor';

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Cobro #${numFmt}`}
        icon="💰"
        subtitle={cobro.cliente_nombre}
        breadcrumbs={[
          { label: 'Cobros', href: '/admin/cobros' },
          { label: `#${numFmt}` },
        ]}
        actions={esAdmin && !cobro.anulado && <AnularBtn id={cobro.id} />}
      />

      {cobro.anulado && (
        <div className="bg-[var(--bg-card-3)] border border-[var(--border-2)] rounded-[12px] p-4 flex items-center gap-3">
          <Ban className="w-5 h-5 text-[var(--fg-muted)]" strokeWidth={2} />
          <div>
            <p className="text-[13px] font-bold text-[var(--fg-muted)]">COBRO ANULADO</p>
            {cobro.anulado_en && (
              <p className="text-[11px] text-[var(--fg-subtle)]">
                {formatFecha(cobro.anulado_en.slice(0, 10))}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3">
              Datos del cobro
            </h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Fecha</dt>
                <dd className="mono">{formatFecha(cobro.fecha)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Cliente</dt>
                <dd>
                  {cobro.cliente ? (
                    <Link href={`/admin/clientes/${cobro.cliente.id}`} className="text-[var(--primary)] font-semibold hover:underline flex items-center gap-1">
                      <Users className="w-3 h-3" strokeWidth={2} />
                      {cobro.cliente_nombre}
                    </Link>
                  ) : (
                    cobro.cliente_nombre
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Forma de cobro</dt>
                <dd>{formaCobroLabels[cobro.forma_cobro] ?? cobro.forma_cobro}</dd>
              </div>
            </dl>

            {cobro.cheque_recibido && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--fg-muted)] font-semibold mb-1">Cheque recibido (en cartera)</p>
                <p className="text-[12px]">
                  N° <strong className="mono">{cobro.cheque_recibido.numero}</strong> · {cobro.cheque_recibido.banco_emisor} · Vto {formatFecha(cobro.cheque_recibido.fecha_cobro)}
                </p>
              </div>
            )}

            {cobro.notas && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--fg-muted)] font-semibold mb-1">Notas</p>
                <p className="text-[12px] whitespace-pre-line">{cobro.notas}</p>
              </div>
            )}
          </div>

          {/* Imputaciones */}
          <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <div className="px-5 py-3 border-b border-[var(--border)]">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Facturas cobradas ({cobro.imputaciones?.length ?? 0})
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
                {(cobro.imputaciones ?? []).map((imp: any) => {
                  const numero = imp.factura
                    ? `${imp.factura.tipo} ${imp.factura.punto_venta}-${String(imp.factura.numero).padStart(8, '0')}`
                    : '-';
                  return (
                    <tr key={imp.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 mono font-semibold">
                        {imp.factura ? (
                          <Link href={`/admin/facturas/${imp.factura.id}`} className="text-[var(--primary)] hover:underline flex items-center gap-1">
                            <FileText className="w-3 h-3" strokeWidth={2} />
                            {numero}
                          </Link>
                        ) : (
                          numero
                        )}
                      </td>
                      <td className="px-3 py-2 mono text-[var(--fg-muted)]">
                        {imp.factura ? formatFecha(imp.factura.fecha) : ''}
                      </td>
                      <td className="px-3 py-2 text-right mono font-bold text-[var(--green)]">
                        ${formatARS(Number(imp.importe))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[var(--green-l)] border-2 border-[var(--green)] rounded-[12px] p-5">
            <p className="text-[11px] font-semibold text-[var(--green)] uppercase tracking-wider mb-1">
              Importe cobrado
            </p>
            <p className="text-[32px] font-bold mono text-[var(--green)] leading-tight">
              ${formatARS(Number(cobro.importe_total))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
