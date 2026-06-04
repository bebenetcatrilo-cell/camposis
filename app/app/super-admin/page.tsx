import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatARS } from '@/lib/utils';

export default async function SuperAdminDashboardPage() {
  const supabase = await createClient();

  // KPIs: cantidad de productores activos, suspendidos, MRR
  const { data: productores } = await supabase
    .from('productores')
    .select('id, nombre, slug, plan, estado_suscripcion, activa, proximo_pago')
    .order('created_at', { ascending: false });

  const total = productores?.length ?? 0;
  const activos = productores?.filter((p) => p.activa && p.estado_suscripcion === 'activa').length ?? 0;
  const suspendidos = productores?.filter((p) => p.estado_suscripcion === 'suspendida').length ?? 0;
  const vencidos = productores?.filter((p) => p.estado_suscripcion === 'vencida').length ?? 0;

  // MRR del último mes (basado en suscripciones)
  const hoy = new Date();
  const haceMes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate())
    .toISOString()
    .slice(0, 10);
  const { data: suscripciones } = await supabase
    .from('suscripciones')
    .select('monto')
    .gte('fecha', haceMes);
  const mrr = suscripciones?.reduce((s, x) => s + (Number(x.monto) || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-3xl tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Panel Super-Admin
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Gestión de productores, suscripciones y métricas del SaaS.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Productores" valor={total} icon="🌾" color="primary" />
        <KpiCard label="Activos" valor={activos} icon="✓" color="green" />
        <KpiCard label="Vencidos" valor={vencidos} icon="⚠️" color="amber" />
        <KpiCard label="Suspendidos" valor={suspendidos} icon="⛔" color="red" />
        <KpiCard label="MRR (últ. mes)" valor={formatARS(mrr)} icon="💰" color="purple" />
      </div>

      {/* Lista resumida de productores */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold">Productores recientes</h2>
          <Link
            href="/super-admin/productores"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {!productores || productores.length === 0 ? (
          <div className="p-10 text-center text-[var(--fg-muted)]">
            <div className="text-4xl mb-3">🌾</div>
            <p className="font-medium">Todavía no hay productores cargados.</p>
            <p className="text-sm mt-1">
              <Link
                href="/super-admin/productores"
                className="text-[var(--primary)] hover:underline"
              >
                Creá el primero
              </Link>
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Nombre</th>
                <th className="px-5 py-3 text-left font-semibold">Slug</th>
                <th className="px-5 py-3 text-left font-semibold">Plan</th>
                <th className="px-5 py-3 text-left font-semibold">Estado</th>
                <th className="px-5 py-3 text-left font-semibold">Próx. pago</th>
              </tr>
            </thead>
            <tbody>
              {productores.slice(0, 5).map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                  <td className="px-5 py-3 font-medium">{p.nombre}</td>
                  <td className="px-5 py-3 text-sm text-[var(--fg-muted)] font-mono">
                    {p.slug}
                  </td>
                  <td className="px-5 py-3 text-sm capitalize">{p.plan}</td>
                  <td className="px-5 py-3 text-sm">
                    <EstadoBadge estado={p.estado_suscripcion} />
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--fg-muted)]">
                    {p.proximo_pago || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  valor,
  icon,
  color,
}: {
  label: string;
  valor: number | string;
  icon: string;
  color: 'primary' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorMap = {
    primary: 'text-[var(--primary)]',
    green: 'text-[var(--green)]',
    amber: 'text-[var(--amber)]',
    red: 'text-[var(--red)]',
    purple: 'text-[var(--purple)]',
  };
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-extrabold ${colorMap[color]}`}>{valor}</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    activa: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    vencida: { bg: 'bg-amber-100', text: 'text-amber-700' },
    suspendida: { bg: 'bg-red-100', text: 'text-red-700' },
    cancelada: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };
  const c = map[estado] ?? map.cancelada;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${c.bg} ${c.text} capitalize`}>
      {estado}
    </span>
  );
}
