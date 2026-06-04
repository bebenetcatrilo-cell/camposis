'use client';

import { useState } from 'react';
import { registrarMovimientoAction } from '@/lib/actions/silos';

type Producto = {
  id: string;
  nombre: string;
  tipo: string;
  unidad: string;
};

type StockRow = {
  producto_id: string;
  campania: string;
  stock_actual_tn: number;
};

export function MovimientoForm({
  siloId,
  productos,
  stock,
}: {
  siloId: string;
  productos: Producto[];
  stock: StockRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [productoId, setProductoId] = useState('');
  const [campania, setCampania] = useState('');

  // Calcular stock disponible para el producto + campaña seleccionados
  const stockDisponible = stock
    .filter(
      (s) =>
        s.producto_id === productoId &&
        (s.campania === campania || (campania === '' && s.campania === '—'))
    )
    .reduce((sum, s) => sum + Number(s.stock_actual_tn), 0);

  const productoSeleccionado = productos.find((p) => p.id === productoId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('silo_id', siloId);

    const r = await registrarMovimientoAction(formData);
    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tipo de movimiento */}
      <div>
        <label className="block text-sm font-medium mb-2">Tipo de movimiento *</label>
        <div className="grid grid-cols-2 gap-3">
          <label className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition ${
            tipo === 'entrada' ? 'border-emerald-500 bg-emerald-50' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
          }`}>
            <input
              type="radio"
              name="tipo"
              value="entrada"
              checked={tipo === 'entrada'}
              onChange={() => setTipo('entrada')}
              className="accent-emerald-600"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">↗ Entrada</p>
              <p className="text-xs text-[var(--fg-muted)]">Ingreso al silo</p>
            </div>
          </label>
          <label className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition ${
            tipo === 'salida' ? 'border-red-500 bg-red-50' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
          }`}>
            <input
              type="radio"
              name="tipo"
              value="salida"
              checked={tipo === 'salida'}
              onChange={() => setTipo('salida')}
              className="accent-red-600"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">↘ Salida</p>
              <p className="text-xs text-[var(--fg-muted)]">Retiro del silo</p>
            </div>
          </label>
        </div>
      </div>

      {/* Producto */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Producto *</label>
        <select
          name="producto_id"
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          required
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        >
          <option value="">— Seleccionar producto —</option>
          <optgroup label="🌾 Cereal">
            {productos.filter((p) => p.tipo === 'cereal').map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </optgroup>
          <optgroup label="🐄 Hacienda">
            {productos.filter((p) => p.tipo === 'hacienda').map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </optgroup>
        </select>
        {productos.length === 0 && (
          <p className="text-xs text-amber-700 mt-1">
            ⚠️ No tenés productos activos. Andá a "Productos" y cargá al menos uno.
          </p>
        )}
      </div>

      {/* Cantidad + Campaña */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Cantidad en {productoSeleccionado?.unidad === 'cabezas' ? 'cabezas' : 'toneladas'} *
          </label>
          <input
            name="cantidad_tn"
            type="number"
            step="0.001"
            min="0.001"
            required
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="0.000"
          />
          {tipo === 'salida' && productoId && (
            <p className="text-xs text-[var(--fg-muted)] mt-1">
              💡 Stock disponible: <strong className="text-[var(--primary)]">{stockDisponible.toFixed(3)}</strong>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Campaña</label>
          <input
            name="campania"
            type="text"
            value={campania}
            onChange={(e) => setCampania(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="2024/25"
          />
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Opcional. Si vacío, se considera "sin campaña".
          </p>
        </div>
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Fecha del movimiento *</label>
        <input
          name="fecha"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Observaciones</label>
        <textarea
          name="observaciones"
          rows={2}
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
          placeholder="Nº remito, transporte, observaciones..."
        />
      </div>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
        <a
          href={`/admin/silos/${siloId}`}
          className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading || productos.length === 0}
          className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Registrando...' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  );
}
