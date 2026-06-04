'use client';

import { useState } from 'react';
import { editarMiPerfilAction, cambiarPasswordAction } from '@/lib/actions/perfil';

// ──────────────────────────────────────────────────────────────
// Formulario editar nombre + teléfono
// ──────────────────────────────────────────────────────────────
export function PerfilForm({
  defaultNombre,
  defaultTelefono,
}: {
  defaultNombre: string;
  defaultTelefono: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const r = await editarMiPerfilAction(formData);
    setLoading(false);
    if (r?.error) setError(r.error);
    else {
      setSuccess(r?.message || 'Perfil actualizado');
      setTimeout(() => setSuccess(null), 3500);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Nombre completo *</label>
        <input
          name="nombre"
          type="text"
          required
          defaultValue={defaultNombre}
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Teléfono</label>
        <input
          name="telefono"
          type="tel"
          defaultValue={defaultTelefono}
          placeholder="3512345678"
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-3 py-2 rounded-lg">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-sm px-3 py-2 rounded-lg">
          ✓ {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 text-sm"
      >
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────
// Formulario cambiar contraseña
// ──────────────────────────────────────────────────────────────
export function CambiarPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const r = await cambiarPasswordAction(formData);
    setLoading(false);
    if (r?.error) setError(r.error);
    else {
      setSuccess(r?.message || 'Contraseña actualizada');
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(null), 3500);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Contraseña actual *</label>
        <input
          name="password_actual"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Nueva contraseña *</label>
        <input
          name="password_nuevo"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
        <p className="text-xs text-[var(--fg-muted)] mt-1">Mínimo 8 caracteres</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Confirmar nueva contraseña *</label>
        <input
          name="password_confirmar"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-3 py-2 rounded-lg">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-sm px-3 py-2 rounded-lg">
          ✓ {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 text-sm"
      >
        {loading ? 'Cambiando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
