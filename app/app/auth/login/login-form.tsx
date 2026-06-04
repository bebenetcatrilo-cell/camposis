'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/lib/actions/auth';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (redirectTo) formData.set('redirectTo', redirectTo);

    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // si fue exitoso, loginAction hace redirect()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
