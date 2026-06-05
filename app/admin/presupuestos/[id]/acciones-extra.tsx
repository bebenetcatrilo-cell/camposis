'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Receipt, AlertCircle, X } from 'lucide-react';
import { duplicarPresupuestoAction, convertirPresupuestoAFacturaAction } from '@/lib/actions/presupuestos';

type Props = {
  presupuestoId: string;
  numero: string;
  estado: string;
};

export function AccionesExtra({ presupuestoId, numero, estado }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalConvertir, setModalConvertir] = useState(false);
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B' | 'C' | 'X'>('B');

  const yaFacturado = estado === 'facturado';

  function duplicar() {
    if (!confirm(`Duplicar presupuesto N° ${numero}?\n\nSe va a crear una copia nueva con todos los items.`)) return;
    startTransition(async () => {
      const res = await duplicarPresupuestoAction(presupuestoId);
      if (res?.error) alert('Error: ' + res.error);
    });
  }

  function abrirConvertir() {
    if (yaFacturado) {
      if (!confirm(`⚠️ Este presupuesto YA está marcado como facturado.\n\n¿Querés crear OTRA factura igualmente?`)) return;
    }
    setModalConvertir(true);
  }

  function confirmarConvertir() {
    setModalConvertir(false);
    startTransition(async () => {
      const res = await convertirPresupuestoAFacturaAction(presupuestoId, tipoFactura);
      if (res?.error) alert('Error: ' + res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={duplicar}
        disabled={isPending}
        className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm flex items-center gap-2 disabled:opacity-50"
      >
        <Copy className="w-4 h-4" strokeWidth={2} />
        {isPending ? '...' : 'Duplicar'}
      </button>

      <button
        type="button"
        onClick={abrirConvertir}
        disabled={isPending || estado === 'rechazado'}
        title={estado === 'rechazado' ? 'No podés facturar un presupuesto rechazado' : 'Convertir en factura'}
        className="px-4 py-2 bg-[var(--green)] text-white rounded-lg font-semibold hover:opacity-90 transition text-sm flex items-center gap-2 disabled:opacity-50"
      >
        <Receipt className="w-4 h-4" strokeWidth={2} />
        Convertir a factura
      </button>

      {modalConvertir && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50 p-4" onClick={() => setModalConvertir(false)}>
          <div className="bg-white rounded-[12px] p-5 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-bold">Convertir a factura</h3>
                <p className="text-[12px] text-[var(--fg-muted)] mt-0.5">Presupuesto N° {numero}</p>
              </div>
              <button onClick={() => setModalConvertir(false)} className="p-1 rounded-[6px] hover:bg-[var(--bg-hover)]">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="bg-[var(--bg-card-2)] border border-[var(--border)] rounded-[6px] p-3 mb-4 text-[12px] text-[var(--fg-muted)]">
              💡 Se va a crear una factura nueva en estado <strong>BORRADOR</strong> con todos los items del presupuesto. Después podrás editarla o emitirla.
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-2 uppercase tracking-wider">
                Tipo de factura
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['A', 'B', 'C', 'X'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoFactura(t)}
                    className={`py-3 rounded-[8px] border-2 text-[20px] font-bold font-serif transition ${
                      tipoFactura === t
                        ? 'border-[var(--primary)] bg-[var(--primary-ll)] text-[var(--primary)]'
                        : 'border-[var(--border)] bg-white hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-2 grid grid-cols-2 gap-1">
                <span><strong>A</strong>: RI a RI (discrimina IVA)</span>
                <span><strong>B</strong>: RI a CF/Monotrib.</span>
                <span><strong>C</strong>: Monotributo emisor</span>
                <span><strong>X</strong>: Sin valor fiscal</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalConvertir(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px]">
                Cancelar
              </button>
              <button onClick={confirmarConvertir}
                className="px-4 py-2 bg-[var(--green)] text-white rounded-lg font-semibold hover:opacity-90 transition text-[13px] flex items-center gap-2">
                <Receipt className="w-4 h-4" strokeWidth={2} />
                Crear factura {tipoFactura}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
