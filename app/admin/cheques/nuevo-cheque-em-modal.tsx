'use client';

import { useState } from 'react';
import { crearChequeEmitidoAction } from '@/lib/actions/cheques';

export function NuevoChequeEmitidoModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const r = await crearChequeEmitidoAction(formData);
    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">📤 Nuevo cheque emitido</h3>
          <button onClick={onClose} className="text-2xl hover:opacity-70">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nº de cheque *</label>
              <input
                name="numero"
                required
                placeholder="Ej: 12345678"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Banco propio *</label>
              <input
                name="banco_propio"
                required
                placeholder="Ej: Galicia"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha emisión *</label>
              <input
                name="fecha_emision"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha pago (vto) *</label>
              <input
                name="fecha_pago"
                type="date"
                required
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Importe ($) *</label>
              <input
                name="importe"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beneficiario *</label>
              <input
                name="beneficiario"
                required
                placeholder="A quién va el cheque"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Concepto (qué pagás)</label>
            <input
              name="concepto"
              placeholder="Ej: Alquiler local, Sueldo Juan, Compra de cereal..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              name="notas"
              rows={2}
              placeholder="Observaciones..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
            />
          </div>

          {error && (
            <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-3 py-2 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-3 border-t border-[var(--border)]">
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
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm disabled:opacity-60"
            >
              {loading ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
