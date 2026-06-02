import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, productores(nombre, nombre_campo)')
    .eq('id', user!.id)
    .single();

  const productor = Array.isArray(perfil?.productores)
    ? perfil!.productores[0]
    : perfil?.productores;

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-3xl tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Hola, {perfil?.nombre} 🌾
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Bienvenido a{' '}
          <strong>{productor?.nombre_campo ?? productor?.nombre}</strong>
        </p>
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
        <div className="text-center space-y-3 py-12">
          <div className="text-5xl">🚧</div>
          <h2 className="text-xl font-bold">Dashboard en construcción</h2>
          <p className="text-[var(--fg-muted)] max-w-md mx-auto">
            Acá van a aparecer los KPIs del campo: kg en silos, cabezas en
            pie, valor del stock, ventas del mes y más.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cereal en silos', valor: '—', icon: '🌾', desc: 'Total almacenado' },
          { label: 'Cabezas en pie', valor: '—', icon: '🐄', desc: 'Hacienda total' },
          { label: 'Valor stock', valor: '—', icon: '💰', desc: 'Cereal + Hacienda' },
          { label: 'Ventas del mes', valor: '—', icon: '📈', desc: 'Facturado' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
                {kpi.label}
              </span>
              <span className="text-xl">{kpi.icon}</span>
            </div>
            <div className="text-2xl font-extrabold text-[var(--primary)]">
              {kpi.valor}
            </div>
            <div className="text-xs text-[var(--fg-subtle)] mt-1">{kpi.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
