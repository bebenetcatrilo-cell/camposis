'use client';

import { useState } from 'react';
import { editarProductorAction } from '@/lib/actions/productores';
import type { Productor } from '@/lib/types';

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

export function EditarProductorForm({ productor }: { productor: Productor }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(productor.plan);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('id', productor.id);
    const r = await editarProductorAction(formData);
    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
    // si OK, hace redirect()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          🌾 Datos del productor
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre del cliente *</label>
            <input
              name="nombre"
              type="text"
              required
              defaultValue={productor.nombre}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Slug (no editable)</label>
            <input
              type="text"
              disabled
              value={productor.slug}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm font-mono bg-[var(--bg-hover)] text-[var(--fg-muted)] cursor-not-allowed"
            />
            <p className="text-xs text-[var(--fg-muted)] mt-1">
              El slug no se puede cambiar después de crear (afecta URLs).
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre del campo / establecimiento</label>
          <input
            name="nombre_campo"
            type="text"
            defaultValue={productor.nombre_campo ?? ''}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email contacto *</label>
            <input
              name="email_contacto"
              type="email"
              required
              defaultValue={productor.email_contacto}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Teléfono</label>
            <input
              name="telefono"
              type="tel"
              defaultValue={productor.telefono ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
            <input
              name="whatsapp"
              type="tel"
              defaultValue={productor.whatsapp ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Dirección</label>
            <input
              name="direccion"
              type="text"
              defaultValue={productor.direccion ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">CUIT</label>
            <input
              name="cuit"
              type="text"
              defaultValue={productor.cuit ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Localidad</label>
            <input
              name="localidad"
              type="text"
              defaultValue={productor.localidad ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Provincia</label>
            <select
              name="provincia"
              defaultValue={productor.provincia ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="">— Seleccionar —</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          💎 Plan y suscripción
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Plan</label>
            <select
              name="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as Productor['plan'])}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="trial">🎁 Trial</option>
              <option value="basico">📦 Básico</option>
              <option value="pro">💎 Pro</option>
              <option value="enterprise">🏢 Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Trial termina</label>
            <input
              name="trial_termina"
              type="date"
              defaultValue={productor.trial_termina ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Próximo pago</label>
            <input
              name="proximo_pago"
              type="date"
              defaultValue={productor.proximo_pago ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notas internas</label>
          <textarea
            name="notas_internas"
            rows={3}
            defaultValue={productor.notas_internas ?? ''}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
          />
        </div>
      </section>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
        <a
          href={`/super-admin/productores/${productor.id}`}
          className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
