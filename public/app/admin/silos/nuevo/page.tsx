import Link from 'next/link';
import { SiloForm } from '../silo-form';

export default function NuevoSiloPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/admin/silos"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a silos
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          🌾 Nuevo silo
        </h1>
      </header>
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <SiloForm />
      </div>
    </div>
  );
}
