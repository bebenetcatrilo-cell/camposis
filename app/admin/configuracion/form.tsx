'use client';

import { useState } from 'react';
import { editarConfiguracionAction } from '@/lib/actions/configuracion';
import { UploadLogo } from '@/components/admin/upload-logo';
import type { Productor } from '@/lib/types';

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

export function ConfiguracionForm({ productor }: { productor: Productor }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(productor.color_primario);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const r = await editarConfiguracionAction(formData);
    setLoading(false);
    if (r?.error) {
      setError(r.error);
    } else {
      setSuccess(r?.message || 'Configuración guardada');
      setTimeout(() => setSuccess(null), 3500);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* LOGO */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider mb-4">
          🎨 Logo y branding
        </h3>
        <UploadLogo logoActual={productor.logo_url} />

        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <label className="block text-sm font-medium mb-2">
            Color primario (aparece en presupuestos, facturas y branding)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="color_primario"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded border border-[var(--border)] cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 max-w-[140px] px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="#4a7c2a"
            />
            <div
              className="flex-1 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: color }}
            >
              Vista previa
            </div>
          </div>
        </div>
      </div>

      {/* DATOS DEL CAMPO */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          🌾 Datos del establecimiento
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre / Razón social *</label>
            <input
              name="nombre"
              type="text"
              required
              defaultValue={productor.nombre}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre del campo</label>
            <input
              name="nombre_campo"
              type="text"
              defaultValue={productor.nombre_campo ?? ''}
              placeholder="Estancia La Esperanza"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
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
              placeholder="3512345678"
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
              placeholder="Ruta 8 km 240"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">CUIT</label>
            <input
              name="cuit"
              type="text"
              defaultValue={productor.cuit ?? ''}
              placeholder="20-12345678-9"
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
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-sm px-4 py-3 rounded-lg">
          ✓ {success}
        </div>
      )}

      <div className="flex gap-3 justify-end">
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
