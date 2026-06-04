'use client';

import { useState } from 'react';
import { crearProductoAction } from '@/lib/actions/productos';

export function NuevoProductoForm({ tipo }: { tipo: 'cereal' | 'hacienda' }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('tipo', tipo);
    const r = await crearProductoAction(formData);
    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* DATOS COMUNES */}
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
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder={tipo === 'cereal' ? 'Soja DM 4621 RR' : 'Ternero Angus'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Unidad de medida *</label>
            <select
              name="unidad"
              defaultValue={tipo === 'cereal' ? 'tn' : 'cabezas'}
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              {tipo === 'cereal' ? (
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

      {/* CAMPOS DE CEREAL */}
      {tipo === 'cereal' && (
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
                placeholder="Soja, Trigo, Maíz..."
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Variedad / Cultivar</label>
              <input
                name="variedad"
                type="text"
                placeholder="DM 4621 RR, Nidera, Don Mario..."
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
                placeholder="2024/25"
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Grado / Calidad</label>
              <input
                name="grado"
                type="text"
                placeholder="Cámara, Grado 1, Industrial..."
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>
        </section>
      )}

      {/* CAMPOS DE HACIENDA */}
      {tipo === 'hacienda' && (
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
                placeholder="Ternero, Novillo, Vaca..."
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Raza</label>
              <input
                name="raza"
                type="text"
                placeholder="Angus, Hereford, Brangus..."
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Sexo</label>
              <select
                name="sexo"
                defaultValue=""
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
                placeholder="12"
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
                placeholder="320"
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>
        </section>
      )}

      {/* OBSERVACIONES */}
      <section className="pt-4 border-t border-[var(--border)]">
        <label className="block text-sm font-medium mb-1.5">Observaciones</label>
        <textarea
          name="observaciones"
          rows={2}
          placeholder="Cualquier nota interna sobre este producto"
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
        />
      </section>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
        <a
          href={`/admin/productos?tipo=${tipo}`}
          className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Creando...' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}
