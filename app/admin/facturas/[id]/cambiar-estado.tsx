'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cambiarEstadoFacturaAction, cargarCaeAction } from '@/lib/actions/facturas';

export function CambiarEstadoFactura({
  id,
  estado,
  cae,
}: {
  id: string;
  estado: string;
  cae: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [modal, setModal] = useState<'anular' | 'cae' | null>(null);

  const [motivoAnular, setMotivoAnular] = useState('');
  const [caeInput, setCaeInput] = useState(cae ?? '');
  const [caeVenc, setCaeVenc] = useState('');

  function emitir() {
    startTransition(async () => {
      const r = await cambiarEstadoFacturaAction(id, 'emitida');
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  function confirmarAnular() {
    if (!confirm('¿Anular esta factura? No se puede deshacer.')) return;
    startTransition(async () => {
      const r = await cambiarEstadoFacturaAction(id, 'anulada', {
        observaciones_cobro: motivoAnular || undefined,
      });
      if (r?.error) alert(r.error);
      else {
        setModal(null);
        router.refresh();
      }
    });
  }

  function guardarCae() {
    if (!caeInput.trim()) return alert('Cargá el CAE');
    startTransition(async () => {
      const r = await cargarCaeAction(id, caeInput, caeVenc);
      if (r?.error) alert(r.error);
      else {
        setModal(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {estado === 'borrador' && (
          <button
            onClick={emitir}
            disabled={pending}
            className="px-3 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition text-sm disabled:opacity-60"
          >
            🧾 Emitir
          </button>
        )}

        {(estado === 'emitida' || estado === 'parcial') && (
          <>
            <button
              onClick={() => setModal('cae')}
              disabled={pending}
              className="px-3 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition text-sm disabled:opacity-60"
            >
              🔢 {cae ? 'Editar' : 'Cargar'} CAE
            </button>
            <button
              onClick={() => setModal('anular')}
              disabled={pending}
              className="px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
            >
              ✗ Anular
            </button>
          </>
        )}
      </div>

      {/* MODAL ANULAR */}
      {modal === 'anular' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-700">✗ Anular factura</h3>
            <p className="text-sm text-[var(--fg-muted)]">
              La factura quedará anulada y se descontará del saldo del cliente lo que aún se debía.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1.5">Motivo (opcional)</label>
              <textarea
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                rows={2}
                placeholder="Ej: Error en el cliente, datos incorrectos..."
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAnular}
                disabled={pending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm disabled:opacity-60"
              >
                {pending ? 'Anulando...' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAE */}
      {modal === 'cae' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">🔢 Cargar CAE de ARCA</h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Cargá el CAE que te devolvió ARCA al emitir la factura manualmente.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1.5">Nº de CAE *</label>
              <input
                type="text"
                value={caeInput}
                onChange={(e) => setCaeInput(e.target.value)}
                placeholder="Ej: 12345678901234"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Vencimiento (opcional)</label>
              <input
                type="date"
                value={caeVenc}
                onChange={(e) => setCaeVenc(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCae}
                disabled={pending}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm disabled:opacity-60"
              >
                {pending ? 'Guardando...' : 'Guardar CAE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
