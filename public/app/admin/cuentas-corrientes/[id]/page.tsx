import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { calcularSaldoCliente } from '@/lib/calcular-saldo';
import { formatARS, formatFecha } from '@/lib/utils';

const ESTADO_FACT: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  emitida: { label: 'Pendiente', icon: '⏳', bg: 'bg-amber-100', text: 'text-amber-700' },
  cobrada: { label: 'Cobrada', icon: '✓', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  anulada: { label: 'Anulada', icon: '✗', bg: 'bg-red-100', text: 'text-red-700' },
};

const ESTADO_CHQ: Record<string, { label: string; icon: string }> = {
  cartera: { label: 'En cartera', icon: '📥' },
  depositado: { label: 'Depositado', icon: '💼' },
  acreditado: { label: 'Acreditado', icon: '✓' },
  rechazado: { label: 'Rechazado', icon: '❌' },
  endosado: { label: 'Endosado', icon: '↪' },
  vendido: { label: 'Vendido', icon: '💵' },
  anulado: { label: 'Anulado', icon: '⛔' },
};

type SP = Promise<{ desde?: string; hasta?: string }>;

export default async function CuentaCorrienteDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SP;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const desde = sp.desde ?? '';
  const hasta = sp.hasta ?? '';

  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  // Cliente
  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cliente) notFound();

  // Facturas del cliente (excluyo borradores)
  let qFacturas = supabase
    .from('facturas')
    .select('id, tipo, punto_venta, numero, fecha, total, estado, concepto, fecha_cobro, forma_pago')
    .eq('productor_id', ctx.productor.id)
    .eq('cliente_id', id)
    .neq('estado', 'borrador');

  if (desde) qFacturas = qFacturas.gte('fecha', desde);
  if (hasta) qFacturas = qFacturas.lte('fecha', hasta);

  const { data: facturas } = await qFacturas.order('fecha', { ascending: false });

  // Cheques del cliente
  let qCheques = supabase
    .from('cheques_recibidos')
    .select('id, numero, banco_emisor, fecha_emision, fecha_cobro, importe, estado, factura_id')
    .eq('productor_id', ctx.productor.id)
    .eq('cliente_id', id);

  if (desde) qCheques = qCheques.gte('fecha_emision', desde);
  if (hasta) qCheques = qCheques.lte('fecha_emision', hasta);

  const { data: cheques } = await qCheques.order('fecha_emision', { ascending: false });

  // Calcular saldo (sin filtro de fechas para el saldo TOTAL)
  const { data: facturasTodas } = await supabase
    .from('facturas')
    .select('id, cliente_id, total, estado, fecha')
    .eq('productor_id', ctx.productor.id)
    .eq('cliente_id', id)
    .neq('estado', 'borrador')
    .neq('estado', 'anulada');

  const { data: chequesTodos } = await supabase
    .from('cheques_recibidos')
    .select('id, cliente_id, factura_id, importe, estado, fecha_emision')
    .eq('productor_id', ctx.productor.id)
    .eq('cliente_id', id);

  const saldo = calcularSaldoCliente(
    Number(cliente.saldo_cta_cte) || 0,
    (facturasTodas ?? []) as any,
    (chequesTodos ?? []) as any
  );

  // Extracto cronológico combinado
  type Movimiento = {
    tipo: 'factura' | 'cheque' | 'saldo_inicial';
    fecha: string;
    descripcion: string;
    debe: number;
    haber: number;
    detalle?: string;
    estado?: string;
    href?: string;
  };

  const movimientos: Movimiento[] = [];

  if (Number(cliente.saldo_cta_cte) !== 0) {
    movimientos.push({
      tipo: 'saldo_inicial',
      fecha: cliente.created_at.slice(0, 10),
      descripcion: 'Saldo inicial',
      debe: Number(cliente.saldo_cta_cte) > 0 ? Number(cliente.saldo_cta_cte) : 0,
      haber: Number(cliente.saldo_cta_cte) < 0 ? Math.abs(Number(cliente.saldo_cta_cte)) : 0,
      detalle: 'Saldo cargado al crear el cliente',
    });
  }

  (facturas ?? []).forEach((f) => {
    if (f.estado === 'emitida') {
      movimientos.push({
        tipo: 'factura',
        fecha: f.fecha,
        descripcion: `${f.tipo === 'X' ? 'Recibo X' : `Factura ${f.tipo}`} ${f.punto_venta}-${String(f.numero).padStart(8, '0')}`,
        debe: Number(f.total),
        haber: 0,
        detalle: f.concepto ?? undefined,
        estado: f.estado,
        href: `/admin/facturas/${f.id}`,
      });
    } else if (f.estado === 'cobrada') {
      movimientos.push({
        tipo: 'factura',
        fecha: f.fecha,
        descripcion: `${f.tipo === 'X' ? 'Recibo X' : `Factura ${f.tipo}`} ${f.punto_venta}-${String(f.numero).padStart(8, '0')}`,
        debe: Number(f.total),
        haber: 0,
        detalle: f.concepto ?? undefined,
        estado: f.estado,
        href: `/admin/facturas/${f.id}`,
      });
      // Cobro
      if (f.fecha_cobro) {
        movimientos.push({
          tipo: 'factura',
          fecha: f.fecha_cobro,
          descripcion: `Cobro factura ${f.punto_venta}-${String(f.numero).padStart(8, '0')}`,
          debe: 0,
          haber: Number(f.total),
          detalle: f.forma_pago ?? undefined,
          href: `/admin/facturas/${f.id}`,
        });
      }
    }
  });

  (cheques ?? []).forEach((c) => {
    if (c.estado === 'anulado' || c.estado === 'rechazado') return;
    movimientos.push({
      tipo: 'cheque',
      fecha: c.fecha_emision,
      descripcion: `Cheque #${c.numero} · ${c.banco_emisor}`,
      debe: 0,
      haber: Number(c.importe),
      detalle: `Vence: ${formatFecha(c.fecha_cobro)} · ${ESTADO_CHQ[c.estado]?.label ?? c.estado}`,
      estado: c.estado,
      href: `/admin/cheques/recibido/${c.id}`,
    });
  });

  movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Calcular saldo acumulado
  let saldoAcumulado = 0;
  const movimientosConSaldo = [...movimientos].reverse().map((m) => {
    saldoAcumulado = saldoAcumulado + m.debe - m.haber;
    return { ...m, saldo_acumulado: saldoAcumulado };
  }).reverse();

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <Link
          href="/admin/cuentas-corrientes"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a cuentas corrientes
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1
              className="text-3xl tracking-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              💰 {cliente.nombre}
            </h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {cliente.cuit ? `CUIT ${cliente.cuit} · ` : ''}
              {cliente.condicion_iva?.replace('_', ' ')}
            </p>
          </div>
          <Link
            href={`/admin/clientes/${cliente.id}`}
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            ✏️ Ficha del cliente
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm border-t-4 border-t-emerald-500">
          <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
            Saldo actual
          </p>
          <p
            className={`text-2xl font-extrabold mt-1 ${
              saldo.saldo_total > 0
                ? 'text-red-700'
                : saldo.saldo_total < 0
                ? 'text-emerald-700'
                : 'text-[var(--fg-muted)]'
            }`}
          >
            {saldo.saldo_total === 0
              ? '$0,00'
              : `$${formatARS(Math.abs(saldo.saldo_total))}`}
          </p>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            {saldo.saldo_total > 0
              ? 'Te debe'
              : saldo.saldo_total < 0
              ? 'Le debés'
              : 'Sin deuda'}
          </p>
        </div>
        <Card
          label="Fact. pendientes"
          value={String(saldo.facturas_pendientes_cantidad)}
          sub={`$${formatARS(saldo.facturas_pendientes_total)}`}
          icon="📋"
          color="text-amber-700"
        />
        <Card
          label="Fact. cobradas"
          value={String(saldo.facturas_cobradas_cantidad)}
          sub={`$${formatARS(saldo.facturas_cobradas_total)}`}
          icon="✓"
          color="text-emerald-700"
        />
        <Card
          label="Cheques aplicados"
          value={String(saldo.cheques_aplicados_cantidad)}
          sub={`$${formatARS(saldo.cheques_aplicados_total)}`}
          icon="💳"
        />
      </div>

      {/* Filtro de fechas */}
      <form
        method="get"
        className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Desde
          </label>
          <input
            type="date"
            name="desde"
            defaultValue={desde}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">
            Hasta
          </label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm"
        >
          Filtrar
        </button>
        {(desde || hasta) && (
          <Link
            href={`/admin/cuentas-corrientes/${cliente.id}`}
            className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Extracto cronológico */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)]">
            📜 Extracto de cuenta
          </h2>
        </div>
        {movimientosConSaldo.length === 0 ? (
          <div className="p-8 text-center text-[var(--fg-muted)]">
            <div className="text-4xl mb-2">📒</div>
            <p className="text-sm">Sin movimientos en el período seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Fecha</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Descripción</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Debe</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Haber</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movimientosConSaldo.map((m, i) => (
                  <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className="px-5 py-2.5 text-xs whitespace-nowrap">
                      {formatFecha(m.fecha)}
                    </td>
                    <td className="px-5 py-2.5">
                      {m.href ? (
                        <Link href={m.href} className="hover:text-[var(--primary)] hover:underline">
                          {m.descripcion}
                        </Link>
                      ) : (
                        m.descripcion
                      )}
                      {m.detalle && (
                        <p className="text-xs text-[var(--fg-muted)]">{m.detalle}</p>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {m.debe > 0 ? (
                        <span className="text-red-700 font-semibold">
                          ${formatARS(m.debe)}
                        </span>
                      ) : (
                        <span className="text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {m.haber > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          ${formatARS(m.haber)}
                        </span>
                      ) : (
                        <span className="text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      <span
                        className={`font-bold ${
                          m.saldo_acumulado > 0
                            ? 'text-red-700'
                            : m.saldo_acumulado < 0
                            ? 'text-emerald-700'
                            : 'text-[var(--fg-muted)]'
                        }`}
                      >
                        ${formatARS(Math.abs(m.saldo_acumulado))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Facturas pendientes (acceso rápido) */}
      {(facturas ?? []).filter((f) => f.estado === 'emitida').length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-bold text-sm uppercase tracking-wider text-amber-900 mb-3">
            ⚠️ Facturas pendientes de cobro
          </h2>
          <div className="space-y-2">
            {(facturas ?? [])
              .filter((f) => f.estado === 'emitida')
              .map((f) => (
                <Link
                  key={f.id}
                  href={`/admin/facturas/${f.id}`}
                  className="flex items-center justify-between bg-white border border-amber-200 rounded-lg p-3 hover:bg-amber-100 transition"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {f.tipo === 'X' ? 'Recibo X' : `Factura ${f.tipo}`}{' '}
                      {f.punto_venta}-{String(f.numero).padStart(8, '0')}
                    </p>
                    <p className="text-xs text-amber-800">{formatFecha(f.fecha)}</p>
                  </div>
                  <p className="text-sm font-bold text-red-700">
                    ${formatARS(Number(f.total))}
                  </p>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  icon,
  color = '',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
            {label}
          </div>
          <div className={`text-lg font-extrabold mt-0.5 truncate ${color}`}>{value}</div>
          {sub && <div className="text-xs text-[var(--fg-muted)]">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
