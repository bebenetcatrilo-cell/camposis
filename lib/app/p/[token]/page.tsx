import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { formatARS, formatFecha } from '@/lib/utils';
import { Sprout, MapPin, Phone, Mail } from 'lucide-react';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';

type Params = Promise<{ token: string }>;

export default async function PresupuestoPublicoPage({
  params,
}: {
  params: Params;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: pres } = await supabase
    .from('presupuestos')
    .select(`
      id, numero, fecha, fecha_vencimiento,
      cliente_nombre, cliente_cuit, cliente_condicion_iva, cliente_direccion, cliente_localidad,
      concepto, subtotal, iva_porcentaje, iva_monto, total, estado, notas,
      productor:productores(id, nombre, nombre_campo, cuit, direccion, localidad, telefono, email, logo_url)
    `)
    .eq('token_publico', token)
    .single();

  if (!pres) notFound();

  const { data: items } = await supabase
    .from('items_presupuesto')
    .select('descripcion, unidad, cantidad, precio_unitario, subtotal')
    .eq('presupuesto_id', pres.id)
    .order('orden');

  const productor: any = Array.isArray(pres.productor) ? pres.productor[0] : pres.productor;
  const numFmt = `0000${pres.numero}`.slice(-4);

  return (
    <div className="min-h-screen bg-[#f3f3f3] py-6 print:bg-white print:py-0">
      <PrintStyles />

      {/* Botones (ocultos en impresión) */}
      <div className="max-w-[800px] mx-auto px-4 mb-4 flex gap-2 justify-end print:hidden">
        <PrintButton />
      </div>

      {/* DOCUMENTO IMPRIMIBLE */}
      <div className="max-w-[800px] mx-auto bg-white shadow-lg print:shadow-none p-8 md:p-12 print:p-8 rounded-[8px] print:rounded-none">
        {/* HEADER con logo y datos */}
        <header className="flex items-start justify-between gap-6 pb-6 border-b-2 border-[var(--primary)] mb-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {productor?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={productor.logo_url}
                alt={productor.nombre}
                className="w-20 h-20 object-contain rounded-[8px]"
              />
            ) : (
              <div className="w-20 h-20 rounded-[8px] bg-[var(--primary)] grid place-items-center shrink-0">
                <Sprout className="w-10 h-10 text-white" strokeWidth={2} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-bold leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                {productor?.nombre_campo || productor?.nombre}
              </h1>
              {productor?.cuit && (
                <p className="text-[11px] text-[var(--fg-muted)] mt-1">CUIT: {productor.cuit}</p>
              )}
              {productor?.direccion && (
                <p className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" strokeWidth={1.8} />
                  {productor.direccion}{productor.localidad ? `, ${productor.localidad}` : ''}
                </p>
              )}
              {productor?.telefono && (
                <p className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1">
                  <Phone className="w-3 h-3" strokeWidth={1.8} />
                  {productor.telefono}
                </p>
              )}
              {productor?.email && (
                <p className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1">
                  <Mail className="w-3 h-3" strokeWidth={1.8} />
                  {productor.email}
                </p>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">
              Presupuesto
            </p>
            <p className="text-[28px] font-bold leading-none mono text-[var(--primary)]" style={{ fontFamily: 'var(--font-serif)' }}>
              N° {numFmt}
            </p>
            <p className="text-[11px] text-[var(--fg-muted)] mt-1">
              Fecha: <strong>{formatFecha(pres.fecha)}</strong>
            </p>
            {pres.fecha_vencimiento && (
              <p className="text-[11px] text-[var(--fg-muted)]">
                Válido hasta: <strong>{formatFecha(pres.fecha_vencimiento)}</strong>
              </p>
            )}
          </div>
        </header>

        {/* CLIENTE */}
        <section className="mb-6 bg-[#f9f9f9] p-4 rounded-[6px] border border-[var(--border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-2">
            Cliente
          </p>
          <p className="text-[16px] font-bold">{pres.cliente_nombre}</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
            {pres.cliente_cuit && (
              <p>
                <span className="text-[var(--fg-muted)]">CUIT:</span>{' '}
                <strong className="mono">{pres.cliente_cuit}</strong>
              </p>
            )}
            {pres.cliente_condicion_iva && (
              <p>
                <span className="text-[var(--fg-muted)]">Cond. IVA:</span>{' '}
                <strong>{pres.cliente_condicion_iva}</strong>
              </p>
            )}
            {pres.cliente_direccion && (
              <p>
                <span className="text-[var(--fg-muted)]">Dirección:</span>{' '}
                {pres.cliente_direccion}
              </p>
            )}
            {pres.cliente_localidad && (
              <p>
                <span className="text-[var(--fg-muted)]">Localidad:</span>{' '}
                {pres.cliente_localidad}
              </p>
            )}
          </div>
        </section>

        {/* CONCEPTO */}
        {pres.concepto && (
          <section className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">
              Concepto
            </p>
            <p className="text-[13px]">{pres.concepto}</p>
          </section>
        )}

        {/* ÍTEMS */}
        <section className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-2">
            Ítems del presupuesto
          </p>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[var(--primary)] text-white">
                <th className="px-2.5 py-2 text-left font-semibold">Descripción</th>
                <th className="px-2.5 py-2 text-center font-semibold w-16">Unid.</th>
                <th className="px-2.5 py-2 text-right font-semibold w-20">Cant.</th>
                <th className="px-2.5 py-2 text-right font-semibold w-28">P. Unit.</th>
                <th className="px-2.5 py-2 text-right font-semibold w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it, idx) => (
                <tr key={idx} className="border-b border-[var(--border)]">
                  <td className="px-2.5 py-2">{it.descripcion}</td>
                  <td className="px-2.5 py-2 text-center text-[var(--fg-muted)]">{it.unidad || '-'}</td>
                  <td className="px-2.5 py-2 text-right mono">{Number(it.cantidad).toLocaleString('es-AR')}</td>
                  <td className="px-2.5 py-2 text-right mono">${formatARS(Number(it.precio_unitario))}</td>
                  <td className="px-2.5 py-2 text-right mono font-semibold">
                    ${formatARS(Number(it.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* TOTALES */}
        <section className="mb-6 flex justify-end">
          <div className="w-full max-w-xs">
            <div className="flex justify-between py-1.5 text-[13px]">
              <span className="text-[var(--fg-muted)]">Subtotal</span>
              <span className="mono font-semibold">${formatARS(Number(pres.subtotal))}</span>
            </div>
            {Number(pres.iva_porcentaje) > 0 && (
              <div className="flex justify-between py-1.5 text-[13px]">
                <span className="text-[var(--fg-muted)]">IVA ({Number(pres.iva_porcentaje)}%)</span>
                <span className="mono font-semibold">${formatARS(Number(pres.iva_monto))}</span>
              </div>
            )}
            <div className="flex justify-between py-2 mt-1 border-t-2 border-[var(--primary)] text-[16px] font-bold">
              <span>TOTAL</span>
              <span className="mono text-[var(--primary)]">${formatARS(Number(pres.total))}</span>
            </div>
          </div>
        </section>

        {/* NOTAS */}
        {pres.notas && (
          <section className="mb-6 bg-[#fffbeb] border border-[#fcd34d] rounded-[6px] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#92400e] font-bold mb-1">
              Notas / Observaciones
            </p>
            <p className="text-[12px] text-[#78350f] whitespace-pre-line">{pres.notas}</p>
          </section>
        )}

        {/* FOOTER */}
        <footer className="pt-4 border-t border-[var(--border)] text-center">
          <p className="text-[10px] text-[var(--fg-subtle)]">
            Presupuesto generado el {formatFecha(pres.fecha)} · Documento sin valor fiscal
          </p>
          <p className="text-[10px] text-[var(--fg-subtle)] mt-1">
            Powered by <strong className="text-[var(--primary)]">Campos SIS</strong>
          </p>
        </footer>
      </div>

      {/* Aviso ESTADO en impresión (oculto) */}
      {pres.estado !== 'pendiente' && (
        <div className="max-w-[800px] mx-auto px-4 mt-3 print:hidden">
          <div className={`p-3 rounded-[6px] text-center text-[13px] font-semibold ${
            pres.estado === 'aprobado' ? 'bg-[#dff6dd] text-[#107c10]' :
            pres.estado === 'rechazado' ? 'bg-[#fde7e9] text-[#c42b1c]' :
            'bg-[#f0f0f0] text-[var(--fg-muted)]'
          }`}>
            Estado: {pres.estado.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}

function PrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        @page { margin: 1cm; size: A4; }
        body { background: white !important; }
        .print\\:hidden { display: none !important; }
        .print\\:bg-white { background: white !important; }
        .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        .print\\:shadow-none { box-shadow: none !important; }
        .print\\:p-8 { padding: 2rem !important; }
        .print\\:rounded-none { border-radius: 0 !important; }
      }
    `}} />
  );
}
