'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  agregarMiembroAction,
  cambiarRolMiembroAction,
  quitarMiembroAction,
  reactivarMiembroAction,
} from '@/lib/actions/miembros';

// ──────────────────────────────────────────────────────────────
// FORMULARIO AGREGAR MIEMBRO
// ──────────────────────────────────────────────────────────────
export function AgregarMiembroForm({ productorId }: { productorId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [crearSiNoExiste, setCrearSiNoExiste] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('productor_id', productorId);
    formData.set('crear_si_no_existe', crearSiNoExiste ? 'true' : 'false');

    const r = await agregarMiembroAction(formData);
    setLoading(false);
    if (r?.error) {
      setError(r.error);
    } else {
      setSuccess('Usuario agregado al productor');
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(null), 3500);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Email del usuario *
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Si el usuario ya existe (porque es miembro de otro productor), se asocia.
            Si no, podés crearlo nuevo.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Rol</label>
          <select
            name="rol"
            defaultValue="empleado"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="admin_productor">👑 Administrador del productor</option>
            <option value="empleado">👤 Empleado</option>
          </select>
        </div>
      </div>

      <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg p-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={crearSiNoExiste}
            onChange={(e) => setCrearSiNoExiste(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[var(--primary)]"
          />
          <div className="flex-1">
            <div className="text-sm font-medium">Crear usuario nuevo si no existe</div>
            <div className="text-xs text-[var(--fg-muted)]">
              Si tildás esta opción y el email no existe, se crea automáticamente.
            </div>
          </div>
        </label>

        {crearSiNoExiste && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <label className="block text-sm font-medium mb-1.5">
              Nombre del usuario nuevo *
            </label>
            <input
              name="nombre"
              type="text"
              placeholder="Juan Pérez"
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
            <p className="text-xs text-[var(--fg-muted)] mt-1">
              El usuario se crea con contraseña autogenerada. Tenés que ir a Supabase
              y resetearle la contraseña (Authentication → Users → reset).
            </p>
          </div>
        )}
      </div>

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

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 text-sm"
      >
        {loading ? 'Agregando...' : '+ Agregar usuario'}
      </button>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────
// LISTA DE MIEMBROS CON ACCIONES
// ──────────────────────────────────────────────────────────────
type MiembroItem = {
  id: string;
  rol: 'admin_productor' | 'empleado';
  activo: boolean;
  created_at: string;
  perfil: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
    ultimo_login: string | null;
  };
};

export function MiembrosLista({
  miembros,
  productorId,
}: {
  miembros: MiembroItem[];
  productorId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (miembros.length === 0) {
    return (
      <div className="p-10 text-center text-[var(--fg-muted)]">
        <div className="text-4xl mb-3">👤</div>
        <p>Sin usuarios asociados todavía.</p>
        <p className="text-xs mt-2">Agregá usuarios con el formulario de arriba.</p>
      </div>
    );
  }

  function handleCambiarRol(miembroId: string, nuevoRol: 'admin_productor' | 'empleado') {
    startTransition(async () => {
      const r = await cambiarRolMiembroAction(miembroId, nuevoRol);
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  function handleQuitar(miembroId: string, nombre: string) {
    if (!confirm(`¿Quitar a ${nombre} como miembro de este productor?\n\nVa a perder el acceso a este productor pero su cuenta de usuario sigue existiendo.`)) {
      return;
    }
    startTransition(async () => {
      const r = await quitarMiembroAction(miembroId, productorId);
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  function handleReactivar(miembroId: string) {
    startTransition(async () => {
      const r = await reactivarMiembroAction(miembroId, productorId);
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
          <tr>
            <th className="px-6 py-3 text-left font-semibold">Nombre</th>
            <th className="px-6 py-3 text-left font-semibold">Email</th>
            <th className="px-6 py-3 text-left font-semibold">Rol</th>
            <th className="px-6 py-3 text-left font-semibold">Estado</th>
            <th className="px-6 py-3 text-left font-semibold">Último login</th>
            <th className="px-6 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {miembros.map((m) => (
            <tr key={m.id} className="border-t border-[var(--border)]">
              <td className="px-6 py-3 font-medium">{m.perfil.nombre}</td>
              <td className="px-6 py-3">{m.perfil.email}</td>
              <td className="px-6 py-3">
                <select
                  value={m.rol}
                  onChange={(e) => handleCambiarRol(m.id, e.target.value as 'admin_productor' | 'empleado')}
                  disabled={pending || !m.activo}
                  className="text-xs px-2 py-1 border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="admin_productor">👑 Admin</option>
                  <option value="empleado">👤 Empleado</option>
                </select>
              </td>
              <td className="px-6 py-3">
                {m.activo ? (
                  <span className="text-emerald-600 text-xs">✓ Activo</span>
                ) : (
                  <span className="text-red-600 text-xs">✗ Inactivo</span>
                )}
              </td>
              <td className="px-6 py-3 text-[var(--fg-muted)] text-xs">
                {m.perfil.ultimo_login
                  ? new Date(m.perfil.ultimo_login).toLocaleString('es-AR')
                  : '—'}
              </td>
              <td className="px-6 py-3 text-right">
                {m.activo ? (
                  <button
                    onClick={() => handleQuitar(m.id, m.perfil.nombre)}
                    disabled={pending}
                    className="text-xs px-3 py-1.5 border border-red-300 bg-red-50 text-red-700 rounded hover:bg-red-100 transition disabled:opacity-60"
                  >
                    Quitar
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivar(m.id)}
                    disabled={pending}
                    className="text-xs px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition disabled:opacity-60"
                  >
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
