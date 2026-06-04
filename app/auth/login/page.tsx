import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-3">🌾</div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Campos SIS
          </h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Iniciá sesión para continuar
          </p>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <Suspense fallback={<div className="text-sm text-[var(--fg-muted)]">Cargando...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-[var(--fg-muted)]">
          ¿Sos nuevo cliente?{' '}
          <Link
            href="/auth/registro"
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Solicitá tu cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
