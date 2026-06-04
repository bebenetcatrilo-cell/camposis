import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Truck, Wheat, AlertCircle } from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AnularBtn } from './anular-btn';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const estadoLabels: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  pagada:    { label: 'Pagada',    bg: 'var(--green-l)',  color: 'var(--green)',  icon: '✅' },
  pendiente: { label: 'Pendiente', bg: 'var(--orange-l)', color: 'var(--orange)', icon: '⏳' },
  parcial:   { label: 'Parcial',   bg: 'var(--blue-l)',   color: 'var(--blue)',   icon: '½' },
  anulada:   { label: 'Anulada',   bg: 'var(--bg-card-3)',color: 'var(--fg-muted)', icon: '✕' },
};

const formaPagoLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  tarjeta: 'Tarjeta',
  cuenta_corriente: 'Cuenta corriente',
  otro: 'Otro',
};

export default async function CompraDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: compra } = await supabase
    .from('compras')
    .select('*, proveedor:proveedores(id, nombre, cuit), items_compra(*, silo:silos(nombre), producto:productos(nombre))')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!compra) notFound();

  const est = estadoLabels[compra.estado] ?? estadoLabels.pagada;
  const items = (compra.items_compra ?? []).sort((a: any, b: any) => a.orden - b.orden);
  const pendiente = Number(compra.total) - Number(compra.monto_pagado);
  const esAdmin = ctx.rol === 'admin_productor';

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Compra ${compra.numero_factura ? '#' + compra.numero_factura : ''}`}
        icon="🛒"
        subtitle={compra.proveedor_nombre}
        breadcrumbs={[
          { label: 'Compras', href: '/admin/compras' },
          { label: compra.numero_factura || 'Detalle' },
        ]}
        actions={
          esAdmin && compra.estado !== 'anulada' && (
            <AnularBtn id={compra.id} />
          )
        }
      />

      {compra.estado === 'anulada' && (
        <div className="bg-[var(--bg-card-3)] border border-[var(--border-2)] rounded-[12px] p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--fg-muted)]" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-[var(--fg-muted)]">
            Esta compra fue anulada
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Datos */}
          <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3">
              Datos de la factura
            </h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Proveedor</dt>
                <dd>
                  {compra.proveedor ? (
                    <Link href={`/admin/proveedores/${compra.proveedor.id}`} className="text-[var(--primary)] font-semibold hover:underline flex items-center gap-1">
                      <Truck className="w-3 h-3" strokeWidth={2} />
                      {compra.proveedor_nombre}
                    </Link>
                  ) : (
                    <span className="font-semibold">{compra.proveedor_nombre}</span>
                  )}
                </dd>
              </div>
              {compra.proveedor_cuit && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">CUIT</dt>
                  <dd className="mono">{compra.proveedor_cuit}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Fecha</dt>
                <dd className="mono">{formatFecha(compra.fecha)}</dd>
              </div>
              {compra.numero_factura && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Nº Factura</dt>
                  <dd className="mono font-semibold">{compra.tipo_comprobante || ''} {compra.numero_factura}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Forma de pago</dt>
                <dd>{formaPagoLabels[compra.forma_pago] ?? compra.forma_pago}</dd>
              </div>
              {compra.fecha_vencimiento && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Vencimiento</dt>
                  <dd className="mono">{formatFecha(compra.fecha_vencimiento)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Items */}
          <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <div className="px-5 py-3 border-b border-[var(--border)]">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Ítems</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--bg-hover)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Descripción</th>
                    <th className="px-3 py-2 text-center font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Unid.</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Cant.</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">P. Unit.</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any) => (
                    <tr key={it.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">
                        <div>{it.descripcion}</div>
                        {it.suma_stock && (it.silo || it.producto) && (
                          <div className="text-[10px] text-[var(--primary)] flex items-center gap-1 mt-0.5">
                            <Wheat className="w-3 h-3" strokeWidth={2} />
                            {it.producto?.nombre} → {it.silo?.nombre}
                            {it.campania && ` · ${it.campania}`}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-[var(--fg-muted)] mono">{it.unidad || '-'}</td>
                      <td className="px-3 py-2 text-right mono">{Number(it.cantidad).toLocaleString('es-AR')}</td>
                      <td className="px-3 py-2 text-right mono">${formatARS(Number(it.precio_unitario))}</td>
                      <td className="px-3 py-2 text-right mono font-bold">${formatARS(Number(it.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {compra.notas && (
            <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[12px] p-4">
              <h3 className="text-[10px] uppercase tracking-wider text-[#92400e] font-bold mb-1">Notas</h3>
              <p className="text-[12px] text-[#78350f] whitespace-pre-line">{compra.notas}</p>
            </div>
          )}
        </div>

        {/* Sidebar: totales + estado */}
        <div className="space-y-4">
          <div className="rounded-[12px] p-4 border" style={{ background: est.bg, borderColor: est.color }}>
            <div className="flex items-center gap-2">
              <span className="text-[20px]">{est.icon}</span>
              <span className="font-bold text-[13px]" style={{ color: est.color }}>{est.label.toUpperCase()}</span>
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3">Totales</h3>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[var(--fg-muted)]">Subtotal</span>
                <span className="mono font-semibold">${formatARS(Number(compra.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-muted)]">IVA</span>
                <span className="mono font-semibold">${formatARS(Number(compra.iva_monto))}</span>
              </div>
              <div className="flex justify-between border-t-2 border-[var(--primary)] pt-2 mt-2 font-bold text-[15px]">
                <span>TOTAL</span>
                <span className="mono text-[var(--primary)]">${formatARS(Number(compra.total))}</span>
              </div>
              {Number(compra.monto_pagado) > 0 && (
                <div className="flex justify-between text-[var(--green)] text-[12px]">
                  <span>Pagado</span>
                  <span className="mono">${formatARS(Number(compra.monto_pagado))}</span>
                </div>
              )}
              {pendiente > 0 && compra.estado !== 'anulada' && (
                <div className="flex justify-between text-[var(--red)] text-[13px] font-bold">
                  <span>Pendiente</span>
                  <span className="mono">${formatARS(pendiente)}</span>
                </div>
              )}
            </div>
          </div>

          {items.some((it: any) => it.suma_stock) && (
            <div className="bg-[var(--primary-ll)] border border-[var(--primary)] rounded-[12px] p-4">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--primary)] font-bold mb-2 flex items-center gap-1">
                <Wheat className="w-3 h-3" strokeWidth={2} />
                Movimientos de silo
              </h3>
              <p className="text-[11px] text-[var(--primary)]">
                Esta compra generó {items.filter((it: any) => it.suma_stock).length} entrada{items.filter((it: any) => it.suma_stock).length > 1 ? 's' : ''} en silos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
