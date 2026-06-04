import Link from 'next/link';
import { NuevoProductorForm } from './form';

export default function NuevoProductorPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/super-admin/productores"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a productores
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Nuevo productor
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Creá una organización (cliente del SaaS) y opcionalmente su primer
          usuario admin.
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <NuevoProductorForm />
      </div>
    </div>
  );
}
