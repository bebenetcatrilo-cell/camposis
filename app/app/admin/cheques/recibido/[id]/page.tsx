import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AccionesChequeRec } from './acciones';
import { formatARS, formatFecha } from '@/lib/utils';

const ESTADOS: Record<string, { label: string; icon: string; color: string }> = {
  cartera: { label: 'En cartera', icon: '📥', color: 'bg-blue-100 text-blue-700' },
  depositado: { label: 'Depositado', icon: '💼', color: 'bg-amber-100 text-amber-700' },
  acreditado: { label: 'Acreditado', icon: '✓', color: 'bg-emerald-100 text-emerald-700' },
  rechazado: { label: 'Rechazado', icon: '❌', color: 'bg-red-100 text-red-700' },
  endosado: { label: 'Endosado', icon: '↪', color: 'bg-purple-100 text-purple-700' },
  vendido: { label: 'Vendido', icon: '💵', color: 'bg-cyan-100 text-cyan-700' },
  anulado: { label: 'Anulado', icon: '⛔', color: 'bg-gray-100 text-gray-700' },
};

export default async function ChequeRecibidoDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: cheque } = await supabase
    .from('cheques_recibidos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cheque) notFound();

  // Datos vinculados
  let cliente = null;
  let factura = null;
  if (cheque.cliente_id) {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, cuit')
      .eq('id', cheque.cliente_id)
      .single();
    cliente = data;
  }
  if (cheque.factura_id) {
    const { data } = await supabase
      .from('facturas')
      .select('id, tipo, punto_venta, numero, total, estado')
      .eq('id', cheque.factura_id)
      .single();
    factura = data;
  }

  const est = ESTADOS[cheque.estado] ?? ESTADOS.cartera;
  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = cheque.fecha_cobro < hoy && cheque.estado !== 'acreditado' && cheque.estado !== 'vendido' && cheque.estado !== 'anulado';

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <Link
          href="/admin/cheques?tab=recibidos"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a cheques
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1
              className="text-3xl tracking-tight flex items-center gap-3 flex-wrap"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              📥 Cheque #{cheque.numero}
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${est.color}`}>
                {est.icon} {est.label}
              </span>
            </h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {cheque.banco_emisor} · ${formatARS(Number(cheque.importe))}
            </p>
          </div>
          <AccionesChequeRec cheque={cheque} />
        </div>

        {vencido && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-900 text-sm px-4 py-2 rounded-lg">
            ⚠️ Vencido el {formatFecha(cheque.fecha_cobro)} y todavía está en {est.label.toLowerCase()}.
          </div>
        )}
      </header>

      {/* Datos generales */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
          📋 Datos del cheque
        </h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <Dato label="Nº" value={cheque.numero} mono />
          <Dato label="Banco emisor" value={cheque.banco_emisor} />
          <Dato label="Fecha emisión" value={formatFecha(cheque.fecha_emision)} />
          <Dato label="Fecha cobro" value={formatFecha(cheque.fecha_cobro)} />
          <Dato label="Importe" value={`$${formatARS(Number(cheque.importe))}`} />
          <Dato label="A nombre de" value={cheque.a_nombre_de ?? '—'} />
        </div>
      </div>

      {/* Vínculos */}
      {(cliente || factura) && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
            🔗 Vínculos
          </h2>
          <div className="space-y-2 text-sm">
            {cliente && (
              <div>
                <span className="text-[var(--fg-muted)]">Cliente:</span>{' '}
                <Link
                  href={`/admin/clientes/${cliente.id}`}
                  className="font-semibold text-[var(--primary)] hover:underline"
                >
                  {cliente.nombre}
                </Link>
                {cliente.cuit && <span className="text-xs text-[var(--fg-muted)]"> · {cliente.cuit}</span>}
              </div>
            )}
            {factura && (
              <div>
                <span className="text-[var(--fg-muted)]">Factura:</span>{' '}
                <Link
                  href={`/admin/facturas/${factura.id}`}
                  className="font-semibold text-[var(--primary)] hover:underline"
                >
                  {factura.tipo === 'X' ? 'Recibo X' : `Factura ${factura.tipo}`} {factura.punto_venta}-{String(factura.numero).padStart(8, '0')}
                </Link>
                <span className="text-xs text-[var(--fg-muted)]"> · ${formatARS(Number(factura.total))}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Datos por estado */}
      {cheque.estado === 'depositado' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-amber-900 mb-2">💼 Depósito</h2>
          {cheque.banco_deposito && <p className="text-sm">Banco: <strong>{cheque.banco_deposito}</strong></p>}
          {cheque.fecha_deposito && <p className="text-sm">Fecha: <strong>{formatFecha(cheque.fecha_deposito)}</strong></p>}
        </div>
      )}

      {cheque.estado === 'vendido' && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-cyan-900 mb-2">💵 Venta al banco</h2>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            {cheque.banco_venta && <p>Banco que compró: <strong>{cheque.banco_venta}</strong></p>}
            {cheque.fecha_venta && <p>Fecha venta: <strong>{formatFecha(cheque.fecha_venta)}</strong></p>}
            {cheque.monto_recibido && (
              <p>Monto recibido: <strong>${formatARS(Number(cheque.monto_recibido))}</strong></p>
            )}
            {cheque.comision_venta != null && (
              <p>Comisión banco: <strong className="text-red-700">${formatARS(Number(cheque.comision_venta))}</strong></p>
            )}
          </div>
        </div>
      )}

      {cheque.estado === 'endosado' && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-purple-900 mb-2">↪ Endoso</h2>
          {cheque.endosado_a && <p className="text-sm">Endosado a: <strong>{cheque.endosado_a}</strong></p>}
          {cheque.fecha_endoso && <p className="text-sm">Fecha: <strong>{formatFecha(cheque.fecha_endoso)}</strong></p>}
        </div>
      )}

      {cheque.estado === 'rechazado' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-red-900 mb-2">❌ Rechazo</h2>
          {cheque.fecha_rechazo && <p className="text-sm">Fecha: <strong>{formatFecha(cheque.fecha_rechazo)}</strong></p>}
          {cheque.motivo_rechazo && <p className="text-sm">Motivo: {cheque.motivo_rechazo}</p>}
        </div>
      )}

      {cheque.notas && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-2">📝 Notas</h2>
          <p className="text-sm whitespace-pre-wrap">{cheque.notas}</p>
        </div>
      )}

      <div className="text-xs text-[var(--fg-muted)]">
        Creado: {new Date(cheque.created_at).toLocaleString('es-AR')}
      </div>
    </div>
  );
}

function Dato({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">{label}</p>
      <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
