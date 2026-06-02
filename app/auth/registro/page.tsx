import Link from 'next/link';

export default function RegistroPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-5xl mb-3">🌾</div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Solicitá tu cuenta
          </h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Te contactamos en menos de 24 horas
          </p>
        </div>

        {/* Mensaje informativo */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <p className="text-sm text-[var(--fg-muted)]">
            Por ahora las cuentas se crean manualmente para asegurarnos que
            cada productor reciba el onboarding adecuado.
          </p>
          <div className="space-y-2">
            <a
              href="https://wa.me/543512345678?text=Hola%2C%20quiero%20una%20cuenta%20de%20Campos%20SIS"
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[var(--whatsapp)] text-white rounded-lg font-medium hover:opacity-90 transition shadow-sm"
            >
              💬 Pedí tu cuenta por WhatsApp
            </a>
            <a
              href="mailto:contacto@campossis.com.ar?subject=Quiero%20una%20cuenta%20de%20Campos%20SIS"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition"
            >
              ✉️ Mandanos un email
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--fg-muted)]">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/auth/login"
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
