import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ProductoresPage() {
  const supabase = await createClient();

  const { data: productores } = await supabase
    .from('productores')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Productores
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            {productores?.length ?? 0} clientes en el sistema
          </p>
        </div>
        <Link
          href="/super-admin/productores/nuevo"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          + Nuevo productor
        </Link>
      </header>

      {!productores || productores.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-12 shadow-sm text-center">
          <div className="text-5xl mb-3">🌾</div>
          <h2 className="text-lg font-bold">Todavía no hay productores</h2>
          <p className="text-[var(--fg-muted)] text-sm mt-2 max-w-md mx-auto">
            Cuando un cliente te contacte y le creés su cuenta, va a aparecer
            acá. Por ahora la creación es manual desde este panel.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Nombre</th>
                <th className="px-5 py-3 text-left font-semibold">Slug · URL</th>
                <th className="px-5 py-3 text-left font-semibold">Email</th>
                <th className="px-5 py-3 text-left font-semibold">Plan</th>
                <th className="px-5 py-3 text-left font-semibold">Estado</th>
                <th className="px-5 py-3 text-left font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productores.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium">{p.nombre}</div>
                    {p.nombre_campo && (
                      <div className="text-xs text-[var(--fg-muted)]">
                        🌾 {p.nombre_campo}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-mono text-[var(--fg-muted)]">
                    {p.slug}
                    <div className="text-[10px]">
                      {p.slug}.camposis.bbnetsystem.com
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm">{p.email_contacto}</td>
                  <td className="px-5 py-3 text-sm capitalize">{p.plan}</td>
                  <td className="px-5 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        p.estado_suscripcion === 'activa'
                          ? 'bg-emerald-100 text-emerald-700'
                          : p.estado_suscripcion === 'vencida'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.estado_suscripcion}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <Link
                      href={`/super-admin/productores/${p.id}`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
