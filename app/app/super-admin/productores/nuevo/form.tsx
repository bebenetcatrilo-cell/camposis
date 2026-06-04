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

function generarPasswordRandom(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass + '!';
}

export function NuevoProductorForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [crearUsuario, setCrearUsuario] = useState(true);
  const [usarExistente, setUsarExistente] = useState(false);
  const [plan, setPlan] = useState('trial');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  function handleNombreChange(v: string) {
    setNombre(v);
    if (!slug || slug === slugify(nombre)) {
      setSlug(slugify(v));
    }
  }

  function handleGenerar() {
    const nueva = generarPasswordRandom();
    setPassword(nueva);
    setConfirmar(nueva);
    setMostrarPassword(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (crearUsuario && !usarExistente) {
      if (password !== confirmar) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('crear_usuario_admin', crearUsuario ? 'true' : 'false');
    formData.set('usar_existente', usarExistente ? 'true' : 'false');
    const result = await crearProductorAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* DATOS PRODUCTOR */}
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
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="Juan Pérez SA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Slug (interno) *</label>
            <input
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="juanperez"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre del campo</label>
          <input
            name="nombre_campo"
            type="text"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="Estancia La Esperanza"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email contacto *</label>
            <input
              name="email_contacto"
              type="email"
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="contacto@cliente.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Teléfono</label>
            <input
              name="telefono"
              type="tel"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
            <input
              name="whatsapp"
              type="tel"
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
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">CUIT</label>
            <input
              name="cuit"
              type="text"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="20-12345678-9"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Localidad</label>
            <input
              name="localidad"
              type="text"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Provincia</label>
            <select
              name="provincia"
              defaultValue=""
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

      {/* PLAN */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          💎 Plan y suscripción
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Plan inicial</label>
            <select
              name="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="trial">🎁 Trial</option>
              <option value="basico">📦 Básico</option>
              <option value="pro">💎 Pro</option>
              <option value="enterprise">🏢 Enterprise</option>
            </select>
          </div>

          {plan === 'trial' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Trial termina</label>
              <input
                name="trial_termina"
                type="date"
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          )}
          {plan !== 'trial' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Próximo pago</label>
              <input
                name="proximo_pago"
                type="date"
                className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notas internas</label>
          <textarea
            name="notas_internas"
            rows={2}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
          />
        </div>
      </section>

      {/* USUARIO ADMIN */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
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
            <span>Asociar admin ahora</span>
          </label>
        </div>

        {crearUsuario && (
          <>
            <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarExistente}
                  onChange={(e) => setUsarExistente(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[var(--primary)]"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Usar usuario existente</div>
                  <div className="text-xs text-[var(--fg-muted)]">
                    Si este admin ya es usuario de otro productor (multi-membership),
                    tildá esto. Solo necesitás su email.
                  </div>
                </div>
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Email del admin *
                </label>
                <input
                  name="admin_email"
                  type="email"
                  required={crearUsuario}
                  className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="juan@cliente.com"
                />
              </div>
              {!usarExistente && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Nombre del admin *
                  </label>
                  <input
                    name="admin_nombre"
                    type="text"
                    required={crearUsuario && !usarExistente}
                    className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>
              )}
            </div>

            {!usarExistente && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Contraseña inicial *
                    </label>
                    <div className="flex gap-2">
                      <input
                        name="admin_password"
                        type={mostrarPassword ? 'text' : 'password'}
                        required={crearUsuario && !usarExistente}
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPassword((v) => !v)}
                        className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--bg-hover)] transition"
                        title={mostrarPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {mostrarPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Confirmar contraseña *
                    </label>
                    <input
                      type={mostrarPassword ? 'text' : 'password'}
                      required={crearUsuario && !usarExistente}
                      minLength={8}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      placeholder="Repetí la contraseña"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerar}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  🎲 Generar contraseña automática
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                  <p className="font-semibold">💡 Esta contraseña la vas a usar para entregarle el acceso al cliente.</p>
                  <p>Te recomiendo:</p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Mandala por WhatsApp/email cuando se la des al cliente</li>
                    <li>Pedile que la cambie en su primer login (desde "Mi perfil")</li>
                  </ul>
                </div>
              </>
            )}
          </>
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
