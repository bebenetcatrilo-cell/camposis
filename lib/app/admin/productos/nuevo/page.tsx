import Link from 'next/link';
import { NuevoProductoForm } from './form';

type SearchParams = Promise<{ tipo?: string }>;

export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tipo = (params.tipo === 'hacienda' ? 'hacienda' : 'cereal') as 'cereal' | 'hacienda';

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href={`/admin/productos?tipo=${tipo}`}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a productos
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {tipo === 'cereal' ? '🌾 Nuevo cereal' : '🐄 Nuevo producto de hacienda'}
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Completá los datos del producto.
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <NuevoProductoForm tipo={tipo} />
      </div>
    </div>
  );
}
