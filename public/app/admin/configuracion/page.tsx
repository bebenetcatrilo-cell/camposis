import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ConfiguracionForm } from './form';

export default async function ConfiguracionPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  // Solo admin del productor puede editar
  if (ctx.rol !== 'admin_productor') {
    return (
      <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-lg font-bold">Sin permisos</h2>
        <p className="text-[var(--fg-muted)] text-sm mt-2">
          Solo el administrador del productor puede editar la configuración.
          Contactá al administrador para hacer cambios.
        </p>
        <Link
          href="/admin"
          className="inline-block mt-4 px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1
          className="text-3xl tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          ⚙️ Configuración
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Datos del establecimiento que aparecen en tus presupuestos y facturas.
        </p>
      </header>

      <ConfiguracionForm productor={ctx.productor} />
    </div>
  );
}
