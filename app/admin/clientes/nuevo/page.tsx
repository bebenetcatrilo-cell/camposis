import Link from 'next/link';
import { ClienteForm } from '../cliente-form';

export default function NuevoClientePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/admin/clientes"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a clientes
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          👥 Nuevo cliente
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Cargá los datos de un nuevo cliente o proveedor.
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <ClienteForm />
      </div>
    </div>
  );
}
