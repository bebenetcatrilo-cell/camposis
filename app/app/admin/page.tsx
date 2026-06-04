import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Package,
  Wheat,
  FileText,
  Receipt,
  CreditCard,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { formatARS, formatFecha } from '@/lib/utils';
import { calcularSaldoCliente } from '@/lib/calcular-saldo';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';

export default async function AdminDashboardPage() {
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const productor = ctx.productor;

  // ── Clientes activos ──
  const { count: totalClientes } = await supabase
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', productor.id)
    .eq('activo', true);

  // ── Productos activos ──
  const { count: totalProductos } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', productor.id)
    .eq('activo', true);

  // ── Silos activos ──
  const { count: totalSilos } = await supabase
    .from('silos')
    .select('id', { count: 'exact', head: true })
    .eq('productor_id', productor.id)
    .eq('activo', true);

  // ── Stock total silos ──
  const { data: stockTotal } = await supabase
    .from('stock_silos_total')
    .select('stock_total_tn')
    .eq('productor_id', productor.id);

  const stockGlobal = (stockTotal ?? []).reduce(
    (s, x) => s + Number(x.stock_total_tn ?? 0),
    0
  );

  // ── Facturas KPI ──
  const { data: facKpis } = await supabase
    .from('facturas')
    .select('estado, total')
    .eq('productor_id', productor.id);

  const fkpi = (facKpis ?? []).reduce(
    (acc, f) => {
      const t = Number(f.total) || 0;
      if (f.estado === 'emitida') {
        acc.emitidas++;
        acc.monto_emitido += t;
      }
      if (f.estado === 'cobrada') {
        acc.cobradas++;
        acc.monto_cobrado += t;
      }
      return acc;
    },
    { emitidas: 0, cobradas: 0, monto_emitido: 0, monto_cobrado: 0 }
  );

  // ── Cheques en cartera ──
  const { data: chequesEnCartera } = await supabase
    .from('cheques_recibidos')
    .select('importe')
    .eq('productor_id', productor.id)
    .eq('estado', 'cartera');

  const totalCheques = (chequesEnCartera ?? []).reduce(
    (s, c) => s + Number(c.importe),
    0
  );

  // ── Saldo neto cuentas corrientes ──
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, saldo_cta_cte')
    .eq('productor_id', productor.id)
    .eq('activo', true);

  const { data: facturasTodas } = await supabase
    .from('facturas')
    .select('id, cliente_id, total, estado, fecha')
    .eq('productor_id', productor.id)
    .neq('estado', 'borrador')
    .neq('estado', 'anulada');

  const { data: chequesTodos } = await supabase
    .from('cheques_recibidos')
    .select('id, cliente_id, factura_id, importe, estado, fecha_emision')
    .eq('productor_id', productor.id);

  let saldoNeto = 0;
  for (const c of clientes ?? []) {
    const facsC = (facturasTodas ?? []).filter((f) => f.cliente_id === c.id);
    const chqsC = (chequesTodos ?? []).filter((ch) => ch.cliente_id === c.id);
    const s = calcularSaldoCliente(Number(c.saldo_cta_cte) || 0, facsC as any, chqsC as any);
    saldoNeto += s.saldo_total;
  }

  // ── Últimas facturas ──
  const { data: ultimasFact } = await supabase
    .from('facturas')
    .select('id, tipo, punto_venta, numero, fecha, total, estado, cliente_nombre')
    .eq('productor_id', productor.id)
    .neq('estado', 'borrador')
    .order('fecha', { ascending: false })
    .order('numero', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${productor.nombre_campo ?? productor.nombre} 👋`}
        subtitle="Bienvenido al panel de control de tu campo"
      />

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="A cobrar"
          value={`$${formatARS(fkpi.monto_emitido)}`}
          sub={`${fkpi.emitidas} facturas`}
          icon={Clock}
          color="amber"
        />
        <KpiCard
          label="Cobrado"
          value={`$${formatARS(fkpi.monto_cobrado)}`}
          sub={`${fkpi.cobradas} facturas`}
          icon={CheckCircle}
          color="emerald"
        />
        <KpiCard
          label="Cheques en cartera"
          value={`$${formatARS(totalCheques)}`}
          sub={`${(chequesEnCartera ?? []).length} cheques`}
          icon={CreditCard}
          color="blue"
        />
        <KpiCard
          label="Saldo cta. cte."
          value={`$${formatARS(Math.abs(saldoNeto))}`}
          sub={saldoNeto > 0 ? 'A favor (te deben)' : saldoNeto < 0 ? 'En contra (le debés)' : 'Sin deuda'}
          icon={DollarSign}
          color={saldoNeto > 0 ? 'red' : saldoNeto < 0 ? 'amber' : 'gray'}
        />
      </div>

      {/* Inventario */}
      <div>
        <h2
          className="text-lg font-bold mb-3"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Tu negocio
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/clientes" className="group">
            <KpiCard
              label="Clientes"
              value={String(totalClientes ?? 0)}
              icon={Users}
              color="primary"
            />
          </Link>
          <Link href="/admin/productos" className="group">
            <KpiCard
              label="Productos"
              value={String(totalProductos ?? 0)}
              icon={Package}
              color="primary"
            />
          </Link>
          <Link href="/admin/silos" className="group">
            <KpiCard
              label="Silos"
              value={String(totalSilos ?? 0)}
              sub={`${stockGlobal.toFixed(2)} tn en stock`}
              icon={Wheat}
              color="primary"
            />
          </Link>
          <Link href="/admin/cuentas-corrientes" className="group">
            <KpiCard
              label="Cta. Corriente"
              value="Ver"
              sub="Saldos por cliente"
              icon={TrendingUp}
              color="primary"
            />
          </Link>
        </div>
      </div>

      {/* Últimas facturas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Últimas facturas
          </h2>
          <Link
            href="/admin/facturas"
            className="text-xs text-[var(--primary)] hover:underline font-semibold inline-flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-3 h-3" strokeWidth={2.4} />
          </Link>
        </div>

        {!ultimasFact || ultimasFact.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-sm text-center">
            <Receipt className="w-12 h-12 text-[var(--fg-muted)] mx-auto mb-2" strokeWidth={1.4} />
            <p className="text-sm text-[var(--fg-muted)]">
              Aún no tenés facturas. Creá la primera para empezar a registrar tus ventas.
            </p>
            <Link
              href="/admin/facturas/nuevo"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
            >
              + Nueva factura
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nº</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Fecha</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Cliente</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Total</th>
                  <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimasFact.map((f) => {
                  const numeroFmt = `${f.punto_venta}-${String(f.numero).padStart(8, '0')}`;
                  const colorEstado =
                    f.estado === 'cobrada'
                      ? 'bg-emerald-100 text-emerald-700'
                      : f.estado === 'emitida'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700';
                  return (
                    <tr
                      key={f.id}
                      className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/facturas/${f.id}`}
                          className="font-mono font-bold text-[var(--primary)] hover:underline text-xs"
                        >
                          {numeroFmt}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--fg-muted)]">
                        {formatFecha(f.fecha)}
                      </td>
                      <td className="px-5 py-3 font-medium">{f.cliente_nombre}</td>
                      <td className="px-5 py-3 text-right font-bold mono">
                        ${formatARS(Number(f.total))}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colorEstado}`}
                        >
                          {f.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2
          className="text-lg font-bold mb-3"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            href="/admin/facturas/nuevo"
            icon={Receipt}
            label="Nueva factura"
            color="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
          />
          <QuickAction
            href="/admin/presupuestos/nuevo"
            icon={FileText}
            label="Nuevo presupuesto"
            color="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
          />
          <QuickAction
            href="/admin/clientes/nuevo"
            icon={Users}
            label="Nuevo cliente"
            color="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
          />
          <QuickAction
            href="/admin/cheques"
            icon={CreditCard}
            label="Cheques"
            color="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
          />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: any;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-4 border rounded-2xl transition ${color}`}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}
