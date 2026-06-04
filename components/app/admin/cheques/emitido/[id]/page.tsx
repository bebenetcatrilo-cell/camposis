import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AccionesChequeEm } from './acciones';
import { formatARS, formatFecha } from '@/lib/utils';

const ESTADOS: Record<string, { label: string; icon: string; color: string }> = {
  emitido: { label: 'Emitido', icon: '📤', color: 'bg-amber-100 text-amber-700' },
  entregado: { label: 'Entregado', icon: '🤝', color: 'bg-blue-100 text-blue-700' },
  cobrado: { label: 'Cobrado', icon: '💰', color: 'bg-emerald-100 text-emerald-700' },
  anulado: { label: 'Anulado', icon: '⛔', color: 'bg-gray-100 text-gray-700' },
};

export default async function ChequeEmitidoDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: cheque } = await supabase
    .from('cheques_emitidos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!cheque) notFound();

  const est = ESTADOS[cheque.estado] ?? ESTADOS.emitido;
  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = cheque.fecha_pago < hoy && cheque.estado !== 'cobrado' && cheque.estado !== 'anulado';

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <Link
          href="/admin/cheques?tab=emitidos"
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
              📤 Cheque #{cheque.numero}
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${est.color}`}>
                {est.icon} {est.label}
              </span>
            </h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {cheque.banco_propio} → {cheque.beneficiario} · ${formatARS(Number(cheque.importe))}
            </p>
          </div>
          <AccionesChequeEm cheque={cheque} />
        </div>

        {vencido && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-900 text-sm px-4 py-2 rounded-lg">
            ⚠️ Venció el {formatFecha(cheque.fecha_pago)} y el beneficiario todavía no lo cobró.
          </div>
        )}
      </header>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
          📋 Datos del cheque
        </h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <Dato label="Nº" value={cheque.numero} mono />
          <Dato label="Banco propio" value={cheque.banco_propio} />
          <Dato label="Fecha emisión" value={formatFecha(cheque.fecha_emision)} />
          <Dato label="Fecha pago" value={formatFecha(cheque.fecha_pago)} />
          <Dato label="Importe" value={`$${formatARS(Number(cheque.importe))}`} />
          <Dato label="Beneficiario" value={cheque.beneficiario} />
          {cheque.concepto && <Dato label="Concepto" value={cheque.concepto} />}
        </div>
      </div>

      {cheque.estado === 'entregado' && cheque.fecha_entrega && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-blue-900 mb-2">🤝 Entrega</h2>
          <p className="text-sm">Entregado el <strong>{formatFecha(cheque.fecha_entrega)}</strong></p>
        </div>
      )}

      {cheque.estado === 'cobrado' && cheque.fecha_cobro && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-900 mb-2">💰 Cobro</h2>
          <p className="text-sm">Cobrado el <strong>{formatFecha(cheque.fecha_cobro)}</strong></p>
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
