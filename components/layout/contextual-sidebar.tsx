import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import Link from 'next/link';
import { Wallet, TrendingUp, Calendar, FileText, Sparkles } from 'lucide-react';
import { calcularSaldoCliente } from '@/lib/calcular-saldo';
import { formatARS, formatFecha } from '@/lib/utils';

export async function ContextualSidebar() {
  const ctx = await getProductorActivo();
  if (!ctx) return null;

  const supabase = await createClient();
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  // ─── Total a cobrar (facturas emitidas no cobradas) ───
  const { data: factEmitidas } = await supabase
    .from('facturas')
    .select('total')
    .eq('productor_id', ctx.productor.id)
    .eq('estado', 'emitida');

  const totalACobrar = (factEmitidas ?? []).reduce(
    (s, f) => s + Number(f.total),
    0
  );

  // ─── Cobrado este mes (facturas cobradas con fecha_cobro >= mes actual) ───
  const { data: factCobradas } = await supabase
    .from('facturas')
    .select('total, fecha_cobro')
    .eq('productor_id', ctx.productor.id)
    .eq('estado', 'cobrada')
    .gte('fecha_cobro', primerDiaMes);

  const cobradoEsteMes = (factCobradas ?? []).reduce(
    (s, f) => s + Number(f.total),
    0
  );

  // ─── Saldo neto (cuentas corrientes) ───
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, saldo_cta_cte')
    .eq('productor_id', ctx.productor.id)
    .eq('activo', true);

  const { data: facturasTodas } = await supabase
    .from('facturas')
    .select('id, cliente_id, total, estado, fecha')
    .eq('productor_id', ctx.productor.id)
    .neq('estado', 'borrador')
    .neq('estado', 'anulada');

  const { data: chequesTodos } = await supabase
    .from('cheques_recibidos')
    .select('id, cliente_id, factura_id, importe, estado, fecha_emision')
    .eq('productor_id', ctx.productor.id);

  let saldoNeto = 0;
  for (const c of clientes ?? []) {
    const facsC = (facturasTodas ?? []).filter((f) => f.cliente_id === c.id);
    const chqsC = (chequesTodos ?? []).filter((ch) => ch.cliente_id === c.id);
    const s = calcularSaldoCliente(
      Number(c.saldo_cta_cte) || 0,
      facsC as any,
      chqsC as any
    );
    saldoNeto += s.saldo_total;
  }

  // ─── Últimas facturas EMITIDAS (solo si hay) ───
  const { data: ultimasFacturas } = await supabase
    .from('facturas')
    .select('id, tipo, punto_venta, numero, fecha, total, estado, cliente_nombre')
    .eq('productor_id', ctx.productor.id)
    .neq('estado', 'borrador')
    .order('fecha', { ascending: false })
    .order('numero', { ascending: false })
    .limit(4);

  // ─── Actividad reciente (últimos movimientos) ───
  // Tomamos las últimas 5 cosas creadas
  const { data: ultimasFacturasAct } = await supabase
    .from('facturas')
    .select('id, tipo, numero, total, estado, created_at, cliente_nombre')
    .eq('productor_id', ctx.productor.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const { data: ultimosMovsSilo } = await supabase
    .from('movimientos_silo')
    .select('id, tipo, cantidad_tn, created_at, silo_id, producto:productos(nombre)')
    .eq('productor_id', ctx.productor.id)
    .order('created_at', { ascending: false })
    .limit(3);

  type Actividad = {
    tipo: string;
    descripcion: string;
    fecha: string;
    icon: 'factura' | 'silo' | 'cheque';
  };

  const actividad: Actividad[] = [];

  (ultimasFacturasAct ?? []).forEach((f: any) => {
    actividad.push({
      tipo: 'factura',
      descripcion: `${f.tipo === 'X' ? 'Recibo X' : `Factura ${f.tipo}`} a ${f.cliente_nombre}`,
      fecha: f.created_at,
      icon: 'factura',
    });
  });

  (ultimosMovsSilo ?? []).forEach((m: any) => {
    const prodName = m.producto?.nombre ?? 'producto';
    actividad.push({
      tipo: 'silo',
      descripcion: `${m.tipo === 'entrada' ? 'Ingreso' : 'Salida'} de ${prodName}`,
      fecha: m.created_at,
      icon: 'silo',
    });
  });

  actividad.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const actividadTop = actividad.slice(0, 5);

  return (
    <aside className="w-[280px] shrink-0 hidden xl:flex flex-col gap-4">
      {/* ─── RESUMEN DEL PRODUCTOR ─── */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
        <h3 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold mb-3 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" strokeWidth={2} />
          Resumen del productor
        </h3>

        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-[var(--fg-muted)]">Total a cobrar</p>
            <p className="text-xl font-extrabold text-amber-700 leading-tight">
              ${formatARS(totalACobrar)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--fg-muted)]">Cobrado este mes</p>
            <p className="text-xl font-extrabold text-emerald-700 leading-tight">
              ${formatARS(cobradoEsteMes)}
            </p>
          </div>
          <div className="pt-2 border-t border-[var(--border)]">
            <p className="text-[11px] text-[var(--fg-muted)]">Saldo neto cta. cte.</p>
            <p
              className={`text-xl font-extrabold leading-tight ${
                saldoNeto > 0
                  ? 'text-red-700'
                  : saldoNeto < 0
                  ? 'text-emerald-700'
                  : 'text-[var(--fg)]'
              }`}
            >
              ${formatARS(Math.abs(saldoNeto))}
            </p>
            <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">
              {saldoNeto > 0
                ? 'Te deben'
                : saldoNeto < 0
                ? 'Le debés'
                : 'Sin deuda'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── ÚLTIMAS FACTURAS (solo si hay) ─── */}
      {ultimasFacturas && ultimasFacturas.length > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" strokeWidth={2} />
              Últimas facturas
            </h3>
            <Link
              href="/admin/facturas"
              className="text-[10px] text-[var(--primary)] hover:underline font-semibold"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {ultimasFacturas.map((f) => {
              const numFmt = `${f.punto_venta}-${String(f.numero).padStart(8, '0')}`;
              const colorEstado =
                f.estado === 'cobrada'
                  ? 'bg-emerald-100 text-emerald-700'
                  : f.estado === 'emitida'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-700';
              return (
                <Link
                  key={f.id}
                  href={`/admin/facturas/${f.id}`}
                  className="block p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono font-bold truncate">
                        {numFmt}
                      </p>
                      <p className="text-[10px] text-[var(--fg-muted)] truncate">
                        {f.cliente_nombre}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${colorEstado}`}
                    >
                      {f.estado === 'cobrada'
                        ? 'Pagada'
                        : f.estado === 'emitida'
                        ? 'Pendiente'
                        : f.estado}
                    </span>
                  </div>
                  <p className="text-xs font-bold mt-0.5">
                    ${formatARS(Number(f.total))}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ACTIVIDAD RECIENTE ─── */}
      {actividadTop.length > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <h3 className="text-[11px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            Actividad reciente
          </h3>
          <div className="space-y-2.5">
            {actividadTop.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[var(--primary-bg)] grid place-items-center shrink-0">
                  {a.icon === 'factura' && (
                    <FileText
                      className="w-3.5 h-3.5 text-[var(--primary)]"
                      strokeWidth={2}
                    />
                  )}
                  {a.icon === 'silo' && (
                    <TrendingUp
                      className="w-3.5 h-3.5 text-[var(--primary)]"
                      strokeWidth={2}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate leading-tight">
                    {a.descripcion}
                  </p>
                  <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">
                    {formatTiempoRelativo(a.fecha)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Si no hay nada cargado todavía */}
      {(!ultimasFacturas || ultimasFacturas.length === 0) &&
        actividadTop.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <Sparkles
              className="w-5 h-5 text-blue-600 mb-2"
              strokeWidth={1.8}
            />
            <p className="text-xs font-bold text-blue-900">¡Sistema listo!</p>
            <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
              A medida que cargues clientes, facturas y movimientos, vas a ver
              acá tu resumen y actividad.
            </p>
          </div>
        )}
    </aside>
  );
}

function formatTiempoRelativo(fecha: string): string {
  const ahora = new Date();
  const fechaObj = new Date(fecha);
  const diffMs = ahora.getTime() - fechaObj.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Hace un instante';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH < 24) return `Hace ${diffH}h`;
  if (diffD < 30) return `Hace ${diffD} día${diffD > 1 ? 's' : ''}`;
  return formatFecha(fecha.slice(0, 10));
}
