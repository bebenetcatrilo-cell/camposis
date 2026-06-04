'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { editarProductoAction, eliminarProductoAction } from '@/lib/actions/productos';

type Producto = {
  id: string;
  tipo: 'cereal' | 'hacienda';
  nombre: string;
  unidad: string;
  observaciones: string | null;
  especie: string | null;
  variedad: string | null;
  campania: string | null;
  grado: string | null;
  categoria: string | null;
  raza: string | null;
  sexo: string | null;
  edad_aprox_meses: number | null;
  peso_promedio_kg: number | null;
};

export function EditarProductoForm({ producto }: { producto: Producto }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('id', producto.id);
    const r = await editarProductoAction(formData);
    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar el producto "${producto.nombre}"?\n\nNo se puede deshacer. Si tiene operaciones asociadas (silos, ventas), no se va a poder eliminar.`)) {
      return;
    }
    startTransition(async () => {
      const r = await eliminarProductoAction(producto.id);
      if (r?.error) alert(r.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          📋 Datos generales
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre *</label>
            <input
              name="nombre"
              type="text"
              required
              defaultValue={producto.nombre}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Unidad de medida *</label>
            <select
              name="unidad"
              defaultValue={producto.unidad}
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              {producto.tipo === 'cereal' ? (
                <>
                  <option value="tn">Toneladas (tn)</option>
                  <option value="qq">Quintales (qq)</option>
                  <option value="kg">Kilos (kg)</option>
                </>
              ) : (
                <>
                  <option value="cabezas">Cabezas</option>
                  <option value="kg">Kilos (peso)</option>
                </>
              )}
            </select>
          </div>
        </div>
      </section>

      {producto.tipo === 'cereal' && (
        <section className="space-y-4 pt-4 border-t border-[var(--border)]">
          <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
            🌾 Datos del cereal
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Especie</label>
              <input
                name="especie"
                type="text"
                defaultValue={producto.especie ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Variedad</label>
              <input
                name="variedad"
                type="text"
                defaultValue={producto.variedad ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Campaña</label>
              <input
                name="campania"
                type="text"
                defaultValue={producto.campania ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Grado</label>
              <input
                name="grado"
                type="text"
                defaultValue={producto.grado ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>
        </section>
      )}

      {producto.tipo === 'hacienda' && (
        <section className="space-y-4 pt-4 border-t border-[var(--border)]">
          <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
            🐄 Datos del animal
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Categoría</label>
              <input
                name="categoria"
                type="text"
                defaultValue={producto.categoria ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Raza</label>
              <input
                name="raza"
                type="text"
                defaultValue={producto.raza ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Sexo</label>
              <select
                name="sexo"
                defaultValue={producto.sexo ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              >
                <option value="">— Seleccionar —</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Edad aprox. (meses)</label>
              <input
                name="edad_aprox_meses"
                type="number"
                min="0"
                defaultValue={producto.edad_aprox_meses ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Peso promedio (kg)</label>
              <input
                name="peso_promedio_kg"
                type="number"
                step="0.01"
                min="0"
                defaultValue={producto.peso_promedio_kg ?? ''}
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>
        </section>
      )}

      <section className="pt-4 border-t border-[var(--border)]">
        <label className="block text-sm font-medium mb-1.5">Observaciones</label>
        <textarea
          name="observaciones"
          rows={2}
          defaultValue={producto.observaciones ?? ''}
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
        />
      </section>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-between pt-4 border-t border-[var(--border)] flex-wrap">
        <button
          type="button"
          onClick={handleEliminar}
          disabled={pending || loading}
          className="px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
        >
          🗑 Eliminar producto
        </button>
        <div className="flex gap-3">
          <a
            href={`/admin/productos?tipo=${producto.tipo}`}
            className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 text-sm"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}
