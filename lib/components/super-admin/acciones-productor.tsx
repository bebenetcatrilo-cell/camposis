'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  cambiarEstadoProductorAction,
  eliminarProductorAction,
  registrarPagoAction,
} from '@/lib/actions/productores';

type Props = {
  productorId: string;
  estadoActual: 'activa' | 'vencida' | 'suspendida' | 'cancelada';
  activa: boolean;
  nombre: string;
};

export function AccionesProductor({ productorId, estadoActual, activa, nombre }: Props) {
  const [modal, setModal] = useState<null | 'suspender' | 'eliminar' | 'pago'>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const estaSuspendida = estadoActual === 'suspendida' || !activa;

  function handleSuspender() {
    if (!confirm(`¿Suspender "${nombre}"?\n\nEl cliente no va a poder entrar al sistema hasta que lo reactives.`)) {
      return;
    }
    startTransition(async () => {
      const r = await cambiarEstadoProductorAction(productorId, 'suspendida');
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  function handleReactivar() {
    startTransition(async () => {
      const r = await cambiarEstadoProductorAction(productorId, 'activa');
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  function handleEliminar() {
    if (!confirm(
      `⚠️ ELIMINAR "${nombre}"\n\nEsto borra DEFINITIVAMENTE el productor, sus usuarios y todos sus datos.\n\nNO se puede deshacer.\n\n¿Continuar?`
    )) return;

    startTransition(async () => {
      const r = await eliminarProductorAction(productorId);
      if (r?.error) alert(r.error);
    });
  }

  return (
    <>
      {/* Botón registrar pago */}
      <button
        onClick={() => setModal('pago')}
        disabled={pending}
        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm disabled:opacity-60"
      >
        💰 Registrar pago
      </button>

      {/* Suspender / Reactivar */}
      {estaSuspendida ? (
        <button
          onClick={handleReactivar}
          disabled={pending}
          className="px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition text-sm disabled:opacity-60"
        >
          ✓ Reactivar
        </button>
      ) : (
        <button
          onClick={handleSuspender}
          disabled={pending}
          className="px-4 py-2 border border-amber-300 bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100 transition text-sm disabled:opacity-60"
        >
          ⛔ Suspender
        </button>
      )}

      {/* Eliminar */}
      <button
        onClick={handleEliminar}
        disabled={pending}
        className="px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
      >
        🗑 Eliminar
      </button>

      {/* Modal: Registrar pago */}
      {modal === 'pago' && (
        <RegistrarPagoModal
          productorId={productorId}
          nombre={nombre}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function RegistrarPagoModal({
  productorId,
  nombre,
  onClose,
}: {
  productorId: string;
  nombre: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Defaults
  const hoy = new Date();
  const desde = hoy.toISOString().slice(0, 10);
  const hastaDate = new Date(hoy);
  hastaDate.setMonth(hastaDate.getMonth() + 1);
  const hasta = hastaDate.toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('productor_id', productorId);
    const r = await registrarPagoAction(formData);
    if (r?.error) {
      setError(r.error);
      setLoading(false);
    } else {
      onClose();
      router.refresh();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-lg">💰 Registrar pago</h3>
          <p className="text-xs text-[var(--fg-muted)] mt-0.5">{nombre}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Monto *</label>
            <input
              name="monto"
              type="number"
              step="0.01"
              required
              placeholder="15000"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Plan</label>
            <select
              name="plan"
              defaultValue="basico"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Desde</label>
              <input
                name="periodo_desde"
                type="date"
                defaultValue={desde}
                required
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Hasta</label>
              <input
                name="periodo_hasta"
                type="date"
                defaultValue={hasta}
                required
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Método de pago</label>
            <select
              name="metodo_pago"
              defaultValue="Transferencia"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option>Transferencia</option>
              <option>Efectivo</option>
              <option>Mercado Pago</option>
              <option>Cheque</option>
              <option>Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea
              name="notas"
              rows={2}
              placeholder="Comprobante, número de operación, etc."
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <p className="text-xs text-[var(--fg-muted)] bg-[var(--bg-hover)] p-3 rounded-lg">
            ℹ️ Al registrar el pago, el productor pasa a estado "activa" y la fecha de
            próximo pago se actualiza al período hasta.
          </p>

          <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm disabled:opacity-60"
            >
              {loading ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
