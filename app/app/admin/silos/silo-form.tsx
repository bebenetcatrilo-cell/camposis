'use client';

import { useState, useTransition } from 'react';
import { crearSiloAction, editarSiloAction, eliminarSiloAction } from '@/lib/actions/silos';

type Silo = {
  id: string;
  nombre: string;
  tipo: string;
  ubicacion: string | null;
  capacidad_tn: number | null;
  observaciones: string | null;
};

export function SiloForm({ silo }: { silo?: Silo }) {
  const esEdicion = !!silo;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (esEdicion) formData.set('id', silo!.id);

    const r = esEdicion
      ? await editarSiloAction(formData)
      : await crearSiloAction(formData);

    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
  }

  function handleEliminar() {
    if (!silo) return;
    if (!confirm(`¿Eliminar el silo "${silo.nombre}"?\n\nNo se puede deshacer. Si tiene movimientos, no se va a poder.`)) {
      return;
    }
    startTransition(async () => {
      const r = await eliminarSiloAction(silo.id);
      if (r?.error) alert(r.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre del silo *</label>
          <input
            name="nombre"
            type="text"
            required
            defaultValue={silo?.nombre ?? ''}
            placeholder="Silo aéreo 1"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Tipo *</label>
          <select
            name="tipo"
            defaultValue={silo?.tipo ?? 'aereo'}
            required
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="aereo">🏗️ Aéreo (chapa / hormigón)</option>
            <option value="bolsa">📦 Silo bolsa</option>
            <option value="galpon">🏚️ Galpón / depósito</option>
            <option value="tercero">🏢 En tercero (acopio)</option>
            <option value="otro">📋 Otro</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Ubicación</label>
          <input
            name="ubicacion"
            type="text"
            defaultValue={silo?.ubicacion ?? ''}
            placeholder="Lote 5, Casa central..."
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Capacidad (toneladas)</label>
          <input
            name="capacidad_tn"
            type="number"
            step="0.01"
            min="0"
            defaultValue={silo?.capacidad_tn ?? ''}
            placeholder="500"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Opcional. Si lo cargás, vas a ver % de llenado.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Observaciones</label>
        <textarea
          name="observaciones"
          rows={3}
          defaultValue={silo?.observaciones ?? ''}
          placeholder="Notas internas sobre el silo"
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
        />
      </div>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-between pt-4 border-t border-[var(--border)] flex-wrap">
        {esEdicion ? (
          <button
            type="button"
            onClick={handleEliminar}
            disabled={pending || loading}
            className="px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
          >
            🗑 Eliminar silo
          </button>
        ) : (
          <div></div>
        )}
        <div className="flex gap-3">
          <a
            href={esEdicion ? `/admin/silos/${silo.id}` : '/admin/silos'}
            className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 text-sm"
          >
            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear silo'}
          </button>
        </div>
      </div>
    </form>
  );
}
