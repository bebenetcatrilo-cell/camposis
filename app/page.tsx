import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="text-6xl">🌾</div>
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Campos SIS
          </h1>
          <p className="text-[var(--fg-muted)]">
            Software de gestión para el agro
          </p>
          <p className="text-xs text-[var(--fg-subtle)] mt-1">
            Setup inicial funcionando correctamente ✓
          </p>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 text-left space-y-3 shadow-sm">
          <p className="text-sm font-semibold">Próximos pasos:</p>
          <ol className="text-sm text-[var(--fg-muted)] space-y-2 list-decimal list-inside">
            <li>Crear proyecto en Supabase y configurar .env.local</li>
            <li>Correr el SQL de <code className="bg-[var(--bg-hover)] px-1 rounded">migracion-01-base.sql</code></li>
            <li>Crear tu primer usuario y marcarlo como super_admin</li>
          </ol>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/super-admin"
            className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm"
          >
            Panel super-admin →
          </Link>
          <Link
            href="/auth/login"
            className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition"
          >
            Iniciar sesión
          </Link>
        </div>

        <p className="text-xs text-[var(--fg-subtle)]">
          🌾 Campos SIS · v0.1.0 · Hecho en Argentina 🇦🇷
        </p>
      </div>
    </main>
  );
}
