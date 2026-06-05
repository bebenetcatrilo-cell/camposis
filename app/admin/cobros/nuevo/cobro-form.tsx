'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, AlertCircle, DollarSign, Calculator } from 'lucide-react';
import { crearCobroAction } from '@/lib/actions/cobros';

type Cliente = { id: string; nombre: string; cuit: string | null; saldo_cta_cte: number };
type FacturaPendiente = {
  id: string;
  numero_completo: string;
  fecha: string;
  total: number;
  monto_cobrado: number;
  pendiente: number;
};

type Props = {
  clientes: Cliente[];
  clienteIdPreseleccionado: string | null;
};

const hoy = new Date().toISOString().slice(0, 10);

function fmt(n: number) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(f: string) {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export function CobroForm({ clientes, clienteIdPreseleccionado }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState(clienteIdPreseleccionado ?? '');
  const [fecha, setFecha] = useState(hoy);
  const [formaCobro, setFormaCobro] = useState<'efectivo'|'transferencia'|'cheque_recibido'|'tarjeta'|'otro'>('efectivo');
  const [notas, setNotas] = useState('');

  const [facturasPendientes, setFacturasPendientes] = useState<FacturaPendiente[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [imputaciones, setImputaciones] = useState<Map<string, number>>(new Map());

  // Cheque recibido
  const [chNum, setChNum] = useState('');
  const [chBanco, setChBanco] = useState('');
  const [chLibrador, setChLibrador] = useState('');
  const [chFechaEmision, setChFechaEmision] = useState(hoy);
  const [chFechaCobro, setChFechaCobro] = useState(hoy);

  useEffect(() => {
    if (!clienteId) {
      setFacturasPendientes([]);
      setImputaciones(new Map());
      return;
    }
    setLoadingFacturas(true);
    fetch(`/api/clientes/${clienteId}/facturas-pendientes`)
      .then(r => r.json())
      .then(data => {
        setFacturasPendientes(data.facturas ?? []);
        setLoadingFacturas(false);
      })
      .catch(() => setLoadingFacturas(false));
  }, [clienteId]);

  const importeTotal = useMemo(() => {
    let s = 0;
    imputaciones.forEach(v => { s += v; });
    return s;
  }, [imputaciones]);

  function toggleImputar(f: FacturaPendiente) {
    setImputaciones(prev => {
      const next = new Map(prev);
      if (next.has(f.id)) next.delete(f.id);
      else next.set(f.id, f.pendiente);
      return next;
    });
  }

  function setImporte(facturaId: string, valor: number) {
    setImputaciones(prev => {
      const next = new Map(prev);
      if (valor > 0) next.set(facturaId, valor);
      else next.delete(facturaId);
      return next;
    });
  }

  function imputarTodo() {
    const next = new Map<string, number>();
    for (const f of facturasPendientes) next.set(f.id, f.pendiente);
    setImputaciones(next);
  }

  function submit() {
    setError(null);
    if (!clienteId) return setError('Seleccioná un cliente');
    if (imputaciones.size === 0) return setError('Marcá al menos una factura a cobrar');
    if (importeTotal <= 0) return setError('El importe debe ser > 0');

    const imps = Array.from(imputaciones.entries()).map(([factura_id, importe]) => ({ factura_id, importe }));

    let cheque = null;
    if (formaCobro === 'cheque_recibido') {
      if (!chNum || !chBanco || !chFechaEmision || !chFechaCobro)
        return setError('Completá todos los datos del cheque recibido');
      cheque = {
        numero: chNum.trim(),
        banco_emisor: chBanco.trim(),
        librador: chLibrador.trim() || clientes.find(c => c.id === clienteId)?.nombre || '',
        fecha_emision: chFechaEmision,
        fecha_cobro: chFechaCobro,
        importe: importeTotal,
      };
    }

    startTransition(async () => {
      const res = await crearCobroAction({
        cliente_id: clienteId,
        fecha,
        forma_cobro: formaCobro,
        imputaciones: imps,
        notas: notas.trim() || null,
        cheque,
      });
      if (res && 'error' in res) setError(res.error);
    });
  }

  const cliSel = clientes.find(c => c.id === clienteId);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-[var(--red-l)] border border-[var(--red)] rounded-[6px] p-3 text-[13px] text-[var(--red)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Cliente */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">1</div>
          <h3 className="font-semibold text-[14px]">Cliente y fecha</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Cliente <span className="text-[var(--red)]">*</span>
            </label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">-- Cliente con deuda --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — te debe ${fmt(Number(c.saldo_cta_cte))}
                </option>
              ))}
            </select>
            {clientes.length === 0 && (
              <p className="text-[11px] text-[var(--orange)] mt-1">
                No tenés clientes con deuda. Las facturas cobradas no aparecen.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Fecha del cobro <span className="text-[var(--red)]">*</span>
            </label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"/>
          </div>
        </div>
      </div>

      {/* 2. Facturas */}
      {clienteId && (
        <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">2</div>
              <h3 className="font-semibold text-[14px]">Facturas a cobrar</h3>
              {imputaciones.size > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-ll)] text-[var(--primary)] rounded-[4px] text-[10px] font-bold">
                  {imputaciones.size} seleccionada{imputaciones.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {facturasPendientes.length > 0 && (
              <button type="button" onClick={imputarTodo}
                className="px-3 py-1.5 border border-[var(--border)] rounded-[6px] hover:bg-[var(--bg-hover)] transition text-[12px] font-semibold flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" strokeWidth={2} />
                Cobrar TODO
              </button>
            )}
          </div>

          {loadingFacturas ? (
            <p className="text-[12px] text-[var(--fg-muted)] py-4 text-center">Cargando facturas...</p>
          ) : facturasPendientes.length === 0 ? (
            <p className="text-[12px] text-[var(--fg-muted)] py-4 text-center">
              Este cliente no tiene facturas pendientes de cobro.
            </p>
          ) : (
            <div className="border border-[var(--border)] rounded-[8px] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--bg-hover)]">
                  <tr>
                    <th className="px-2 py-2 text-center w-8"></th>
                    <th className="px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Fecha</th>
                    <th className="px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Factura</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Total</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Cobrado</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Pendiente</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Imputar</th>
                  </tr>
                </thead>
                <tbody>
                  {facturasPendientes.map(f => {
                    const checked = imputaciones.has(f.id);
                    const importe = imputaciones.get(f.id) ?? 0;
                    return (
                      <tr key={f.id} className={`border-t border-[var(--border)] ${checked ? 'bg-[var(--primary-ll)]' : 'hover:bg-[var(--bg-hover)]'}`}>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={checked} onChange={() => toggleImputar(f)}
                            className="w-4 h-4 accent-[var(--primary)]"/>
                        </td>
                        <td className="px-3 py-2 mono text-[11px]">{fmtFecha(f.fecha)}</td>
                        <td className="px-3 py-2 mono">{f.numero_completo}</td>
                        <td className="px-3 py-2 text-right mono">${fmt(f.total)}</td>
                        <td className="px-3 py-2 text-right mono text-[var(--green)]">${fmt(f.monto_cobrado)}</td>
                        <td className="px-3 py-2 text-right mono font-bold text-[var(--red)]">${fmt(f.pendiente)}</td>
                        <td className="px-3 py-2 text-right">
                          {checked ? (
                            <input type="number" step="0.01" min="0" max={f.pendiente} value={importe}
                              onChange={e => setImporte(f.id, Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-[var(--primary)] rounded-[4px] text-[12px] mono text-right focus:outline-none bg-white"/>
                          ) : (
                            <span className="text-[var(--fg-subtle)]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[var(--bg-hover)] border-t-2 border-[var(--primary)]">
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-right font-bold">TOTAL A COBRAR:</td>
                    <td className="px-3 py-2 text-right mono font-bold text-[var(--primary)] text-[14px]">
                      ${fmt(importeTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Forma de cobro */}
      {clienteId && imputaciones.size > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">3</div>
            <h3 className="font-semibold text-[14px]">Forma de cobro</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {[
              { v: 'efectivo', l: '💵 Efectivo' },
              { v: 'transferencia', l: '🏦 Transferencia' },
              { v: 'cheque_recibido', l: '📄 Cheque' },
              { v: 'tarjeta', l: '💳 Tarjeta' },
              { v: 'otro', l: '➕ Otro' },
            ].map(f => (
              <button key={f.v} type="button" onClick={() => setFormaCobro(f.v as any)}
                className={`px-3 py-2 border rounded-[6px] text-[12px] font-semibold transition ${
                  formaCobro === f.v
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-white border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Datos cheque recibido */}
          {formaCobro === 'cheque_recibido' && (
            <div className="mt-4 p-4 bg-[var(--bg-card-2)] rounded-[8px] border border-[var(--border)]">
              <p className="text-[11px] font-semibold text-[var(--fg-muted)] mb-2">
                📄 Datos del cheque (entra en cartera, importe ${fmt(importeTotal)})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Nº cheque</label>
                  <input type="text" value={chNum} onChange={e => setChNum(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono bg-white focus:outline-none focus:border-[var(--primary)]"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Banco emisor</label>
                  <input type="text" value={chBanco} onChange={e => setChBanco(e.target.value)}
                    placeholder="Galicia, Macro..."
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] bg-white focus:outline-none focus:border-[var(--primary)]"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Fecha emisión</label>
                  <input type="date" value={chFechaEmision} onChange={e => setChFechaEmision(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono bg-white focus:outline-none focus:border-[var(--primary)]"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Fecha cobro</label>
                  <input type="date" value={chFechaCobro} onChange={e => setChFechaCobro(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono bg-white focus:outline-none focus:border-[var(--primary)]"/>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Librador (opcional)</label>
                  <input type="text" value={chLibrador} onChange={e => setChLibrador(e.target.value)}
                    placeholder={`Por defecto: ${cliSel?.nombre || 'el cliente'}`}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] bg-white focus:outline-none focus:border-[var(--primary)]"/>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Notas (opcional)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Observaciones..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)] resize-y"/>
          </div>
        </div>
      )}

      {/* Resumen */}
      {clienteId && imputaciones.size > 0 && (
        <div className="bg-[var(--green-l)] border-2 border-[var(--green)] rounded-[12px] p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[var(--green)]">TOTAL A COBRAR</div>
            <div className="text-[28px] font-bold mono text-[var(--green)] leading-tight">
              ${fmt(importeTotal)}
            </div>
            <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">
              {imputaciones.size} factura{imputaciones.size > 1 ? 's' : ''} · {cliSel?.nombre}
            </div>
          </div>
          <DollarSign className="w-16 h-16 text-[var(--green)] opacity-20" strokeWidth={1.5} />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} disabled={isPending}
          className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center gap-2">
          <X className="w-4 h-4" strokeWidth={2} />
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={isPending || imputaciones.size === 0}
          className="px-4 py-2 bg-[var(--green)] text-white rounded-lg font-semibold hover:opacity-90 transition text-[13px] flex items-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" strokeWidth={2} />
          {isPending ? 'Guardando...' : 'Registrar cobro'}
        </button>
      </div>
    </div>
  );
}
