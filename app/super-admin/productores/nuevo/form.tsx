'use client';

import { useState } from 'react';
import { crearProductorAction } from '@/lib/actions/productores';
import { slugify } from '@/lib/utils';

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

export function NuevoProductorForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [crearUsuario, setCrearUsuario] = useState(true);
  const [plan, setPlan] = useState('trial');

  // Auto-derivar slug del nombre
  function handleNombreChange(v: string) {
    setNombre(v);
    if (!slug || slug === slugify(nombre)) {
      setSlug(slugify(v));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('crear_usuario_admin', crearUsuario ? 'true' : 'false');
    const result = await crearProductorAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // si OK, crearProductorAction hace redirect()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ───── DATOS DEL PRODUCTOR ───── */}
      <section className="space-y-4">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          🌾 Datos del productor
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium mb-1.5">
              Nombre del cliente *
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="Juan Pérez SA"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1.5">
              Slug (subdominio) *
            </label>
            <div className="flex items-center gap-1">
              <input
                id="slug"
                name="slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="flex-1 px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                placeholder="juanperez"
              />
            </div>
            <p className="text-xs text-[var(--fg-muted)] mt-1">
              URL: <span className="font-mono">{slug || 'slug'}.camposis.bbnetsystem.com</span>
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="nombre_campo" className="block text-sm font-medium mb-1.5">
            Nombre del campo / establecimiento
          </label>
          <input
            id="nombre_campo"
            name="nombre_campo"
            type="text"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="Estancia La Esperanza"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="email_contacto" className="block text-sm font-medium mb-1.5">
              Email contacto *
            </label>
            <input
              id="email_contacto"
              name="email_contacto"
              type="email"
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="contacto@cliente.com"
            />
          </div>
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium mb-1.5">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="3512345678"
            />
          </div>
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium mb-1.5">
              WhatsApp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="3512345678"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="direccion" className="block text-sm font-medium mb-1.5">
              Dirección
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="Ruta 8 km 240"
            />
          </div>
          <div>
            <label htmlFor="cuit" className="block text-sm font-medium mb-1.5">
              CUIT
            </label>
            <input
              id="cuit"
              name="cuit"
              type="text"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="20-12345678-9"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="localidad" className="block text-sm font-medium mb-1.5">
              Localidad
            </label>
            <input
              id="localidad"
              name="localidad"
              type="text"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="Río Cuarto"
            />
          </div>
          <div>
            <label htmlFor="provincia" className="block text-sm font-medium mb-1.5">
              Provincia
            </label>
            <select
              id="provincia"
              name="provincia"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              defaultValue=""
            >
              <option value="">— Seleccionar —</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ───── PLAN Y SUSCRIPCIÓN ───── */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          💎 Plan y suscripción
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="plan" className="block text-sm font-medium mb-1.5">
              Plan inicial
            </label>
            <select
              id="plan"
              name="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="trial">🎁 Trial (prueba)</option>
              <option value="basico">📦 Básico</option>
              <option value="pro">💎 Pro</option>
              <option value="enterprise">🏢 Enterprise</option>
            </select>
          </div>

          {plan === 'trial' && (
            <div>
              <label htmlFor="trial_termina" className="block text-sm font-medium mb-1.5">
                Trial termina
              </label>
              <input
                id="trial_termina"
                name="trial_termina"
                type="date"
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          )}

          {plan !== 'trial' && (
            <div>
              <label htmlFor="proximo_pago" className="block text-sm font-medium mb-1.5">
                Próximo pago
              </label>
              <input
                id="proximo_pago"
                name="proximo_pago"
                type="date"
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="notas_internas" className="block text-sm font-medium mb-1.5">
            Notas internas (solo super-admin)
          </label>
          <textarea
            id="notas_internas"
            name="notas_internas"
            rows={2}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
            placeholder="Cómo nos conoció, condiciones especiales, etc."
          />
        </div>
      </section>

      {/* ───── USUARIO ADMIN INICIAL ───── */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
            👤 Usuario admin del productor
          </h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={crearUsuario}
              onChange={(e) => setCrearUsuario(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span>Crear ahora</span>
          </label>
        </div>

        {crearUsuario ? (
          <>
            <p className="text-xs text-[var(--fg-muted)] bg-[var(--bg-hover)] p-3 rounded-lg">
              ℹ️ Se creará una cuenta para el cliente. El usuario va a recibir un email para
              setear su contraseña.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="admin_nombre" className="block text-sm font-medium mb-1.5">
                  Nombre del admin
                </label>
                <input
                  id="admin_nombre"
                  name="admin_nombre"
                  type="text"
                  className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label htmlFor="admin_email" className="block text-sm font-medium mb-1.5">
                  Email del admin (login)
                </label>
                <input
                  id="admin_email"
                  name="admin_email"
                  type="email"
                  className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="juan@cliente.com"
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-[var(--fg-muted)] bg-[var(--bg-hover)] p-3 rounded-lg">
            ℹ️ El productor se crea sin usuario admin. Podés agregar usuarios después
            desde la página del productor.
          </p>
        )}
      </section>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
        <a
          href="/super-admin/productores"
          className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Creando...' : 'Crear productor'}
        </button>
      </div>
    </form>
  );
}
