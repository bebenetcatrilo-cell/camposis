'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, AlertCircle, DollarSign, FileText, Calculator } from 'lucide-react';
import { crearPagoProveedorAction } from '@/lib/actions/pagos-proveedor';

type Proveedor = { id: string; nombre: string; cuit: string | null; saldo_cta_cte: number };
type ChequeRecibido = { id: string; numero: string; banco: string; importe: number; fecha_pago: string; librador: string };
type CompraPendiente = {
  id: string;
  numero_factura: string | null;
  fecha: string;
  total: number;
  monto_pagado: number;
  pendiente: number;
};

type Props = {
  proveedores: Proveedor[];
  chequesRecibidos: ChequeRecibido[];
  proveedorIdPreseleccionado: string | null;
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

export function PagoForm({ proveedores, chequesRecibidos, proveedorIdPreseleccionado }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [proveedorId, setProveedorId] = useState(proveedorIdPreseleccionado ?? '');
  const [fecha, setFecha] = useState(hoy);
  const [formaPago, setFormaPago] = useState<'efectivo'|'transferencia'|'cheque_propio'|'cheque_endoso'|'tarjeta'|'otro'>('efectivo');
  const [notas, setNotas] = useState('');

  // Compras pendientes del proveedor seleccionado
  const [comprasPendientes, setComprasPendientes] = useState<CompraPendiente[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);

  // Map: compra_id → importe a imputar
  const [imputaciones, setImputaciones] = useState<Map<string, number>>(new Map());

  // Cheque propio (cuando forma_pago = cheque_propio)
  const [chNum, setChNum] = useState('');
  const [chBanco, setChBanco] = useState('');
  const [chFechaEmision, setChFechaEmision] = useState(hoy);
  const [chFechaPago, setChFechaPago] = useState(hoy);

  // Cheque endoso
  const [chequeRecibidoId, setChequeRecibidoId] = useState('');

  // Cargar compras pendientes cuando cambia el proveedor
  useEffect(() => {
    if (!proveedorId) {
      setComprasPendientes([]);
      setImputaciones(new Map());
      return;
    }
    setLoadingCompras(true);
    fetch(`/api/proveedores/${proveedorId}/compras-pendientes`)
      .then(r => r.json())
      .then(data => {
        setComprasPendientes(data.compras ?? []);
        setLoadingCompras(false);
      })
      .catch(() => setLoadingCompras(false));
  }, [proveedorId]);

  const importeTotal = useMemo(() => {
    let s = 0;
    imputaciones.forEach(v => { s += v; });
    return s;
  }, [imputaciones]);

  function toggleImputar(compra: CompraPendiente) {
    setImputaciones(prev => {
      const next = new Map(prev);
      if (next.has(compra.id)) next.delete(compra.id);
      else next.set(compra.id, compra.pendiente);
      return next;
    });
  }

  function setImporte(compraId: string, valor: number) {
    setImputaciones(prev => {
      const next = new Map(prev);
      if (valor > 0) next.set(compraId, valor);
      else next.delete(compraId);
      return next;
    });
  }

  function imputarTodo() {
    const next = new Map<string, number>();
    for (const c of comprasPendientes) next.set(c.id, c.pendiente);
    setImputaciones(next);
  }

  function submit() {
    setError(null);
    if (!proveedorId) return setError('Seleccioná un proveedor');
    if (imputaciones.size === 0) return setError('Marcá al menos una compra a pagar');
    if (importeTotal <= 0) return setError('El importe total debe ser mayor a 0');

    const imps = Array.from(imputaciones.entries()).map(([compra_id, importe]) => ({ compra_id, importe }));

    let chequePropio = null;
    let chequeRecibidoIdFinal = null;

    if (formaPago === 'cheque_propio') {
      if (!chNum || !chBanco || !chFechaEmision || !chFechaPago)
        return setError('Completá todos los datos del cheque propio');
      chequePropio = {
        numero: chNum.trim(),
        banco_propio: chBanco.trim(),
        fecha_emision: chFechaEmision,
        fecha_pago: chFechaPago,
        importe: importeTotal,
      };
    }

    if (formaPago === 'cheque_endoso') {
      if (!chequeRecibidoId) return setError('Seleccioná el cheque a endosar');
      chequeRecibidoIdFinal = chequeRecibidoId;
    }

    startTransition(async () => {
      const res = await crearPagoProveedorAction({
        proveedor_id: proveedorId,
        fecha,
        forma_pago: formaPago,
        imputaciones: imps,
        notas: notas.trim() || null,
        cheque_propio: chequePropio,
        cheque_recibido_id: chequeRecibidoIdFinal,
      });
      if (res && 'error' in res) setError(res.error);
    });
  }

  const provSel = proveedores.find(p => p.id === proveedorId);
  const chequeEndosoSel = chequesRecibidos.find(c => c.id === chequeRecibidoId);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-[var(--red-l)] border border-[var(--red)] rounded-[6px] p-3 text-[13px] text-[var(--red)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Proveedor */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">1</div>
          <h3 className="font-semibold text-[14px]">Proveedor y fecha</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Proveedor <span className="text-[var(--red)]">*</span>
            </label>
            <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">-- Proveedor con saldo pendiente --</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — debés ${fmt(Number(p.saldo_cta_cte))}
                </option>
              ))}
            </select>
            {proveedores.length === 0 && (
              <p className="text-[11px] text-[var(--orange)] mt-1">
                No tenés proveedores con saldo pendiente. Las compras pagadas no aparecen.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Fecha del pago <span className="text-[var(--red)]">*</span>
            </label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"/>
          </div>
        </div>
      </div>

      {/* 2. Compras a pagar */}
      {proveedorId && (
        <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">2</div>
              <h3 className="font-semibold text-[14px]">Compras a saldar</h3>
              {imputaciones.size > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-ll)] text-[var(--primary)] rounded-[4px] text-[10px] font-bold">
                  {imputaciones.size} seleccionada{imputaciones.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {comprasPendientes.length > 0 && (
              <button type="button" onClick={imputarTodo}
                className="px-3 py-1.5 border border-[var(--border)] rounded-[6px] hover:bg-[var(--bg-hover)] transition text-[12px] font-semibold flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" strokeWidth={2} />
                Imputar TODO
              </button>
            )}
          </div>

          {loadingCompras ? (
            <p className="text-[12px] text-[var(--fg-muted)] py-4 text-center">Cargando compras...</p>
          ) : comprasPendientes.length === 0 ? (
            <p className="text-[12px] text-[var(--fg-muted)] py-4 text-center">
              Este proveedor no tiene compras pendientes de pago.
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
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Pagado</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Pendiente</th>
                    <th className="px-3 py-2 text-right font-semibold text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Imputar</th>
                  </tr>
                </thead>
                <tbody>
                  {comprasPendientes.map(c => {
                    const checked = imputaciones.has(c.id);
                    const importe = imputaciones.get(c.id) ?? 0;
                    return (
                      <tr key={c.id} className={`border-t border-[var(--border)] ${checked ? 'bg-[var(--primary-ll)]' : 'hover:bg-[var(--bg-hover)]'}`}>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={checked} onChange={() => toggleImputar(c)}
                            className="w-4 h-4 accent-[var(--primary)]"/>
                        </td>
                        <td className="px-3 py-2 mono text-[11px]">{fmtFecha(c.fecha)}</td>
                        <td className="px-3 py-2 mono">{c.numero_factura || '-'}</td>
                        <td className="px-3 py-2 text-right mono">${fmt(c.total)}</td>
                        <td className="px-3 py-2 text-right mono text-[var(--green)]">${fmt(c.monto_pagado)}</td>
                        <td className="px-3 py-2 text-right mono font-bold text-[var(--red)]">${fmt(c.pendiente)}</td>
                        <td className="px-3 py-2 text-right">
                          {checked ? (
                            <input type="number" step="0.01" min="0" max={c.pendiente} value={importe}
                              onChange={e => setImporte(c.id, Number(e.target.value))}
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
                    <td colSpan={6} className="px-3 py-2 text-right font-bold">TOTAL A PAGAR:</td>
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

      {/* 3. Forma de pago */}
      {proveedorId && imputaciones.size > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">3</div>
            <h3 className="font-semibold text-[14px]">Forma de pago</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { v: 'efectivo', l: '💵 Efectivo' },
              { v: 'transferencia', l: '🏦 Transferencia' },
              { v: 'cheque_propio', l: '📄 Cheque propio' },
              { v: 'cheque_endoso', l: '🔄 Endosar cheque' },
              { v: 'tarjeta', l: '💳 Tarjeta' },
              { v: 'otro', l: '➕ Otro' },
            ].map(f => (
              <button key={f.v} type="button" onClick={() => setFormaPago(f.v as any)}
                className={`px-3 py-2 border rounded-[6px] text-[12px] font-semibold transition ${
                  formaPago === f.v
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-white border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Datos cheque propio */}
          {formaPago === 'cheque_propio' && (
            <div className="mt-4 p-4 bg-[var(--bg-card-2)] rounded-[8px] border border-[var(--border)]">
              <p className="text-[11px] font-semibold text-[var(--fg-muted)] mb-2">
                📄 Datos del cheque a emitir (importe ${fmt(importeTotal)})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Nº cheque</label>
                  <input type="text" value={chNum} onChange={e => setChNum(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono bg-white focus:outline-none focus:border-[var(--primary)]"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Banco</label>
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
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Fecha pago</label>
                  <input type="date" value={chFechaPago} onChange={e => setChFechaPago(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono bg-white focus:outline-none focus:border-[var(--primary)]"/>
                </div>
              </div>
            </div>
          )}

          {/* Endosar cheque */}
          {formaPago === 'cheque_endoso' && (
            <div className="mt-4 p-4 bg-[var(--bg-card-2)] rounded-[8px] border border-[var(--border)]">
              <p className="text-[11px] font-semibold text-[var(--fg-muted)] mb-2">
                🔄 Cheque a endosar (importe debe ser ${fmt(importeTotal)})
              </p>
              {chequesRecibidos.length === 0 ? (
                <p className="text-[12px] text-[var(--orange)]">No tenés cheques recibidos en cartera.</p>
              ) : (
                <select value={chequeRecibidoId} onChange={e => setChequeRecibidoId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[12px] bg-white focus:outline-none focus:border-[var(--primary)]">
                  <option value="">-- Seleccioná cheque --</option>
                  {chequesRecibidos.map(c => (
                    <option key={c.id} value={c.id}>
                      #{c.numero} - {c.banco} - ${fmt(c.importe)} - vto {fmtFecha(c.fecha_pago)} - {c.librador}
                    </option>
                  ))}
                </select>
              )}
              {chequeEndosoSel && Math.abs(Number(chequeEndosoSel.importe) - importeTotal) > 0.01 && (
                <p className="text-[11px] text-[var(--red)] mt-2">
                  ⚠️ Importe del cheque (${fmt(chequeEndosoSel.importe)}) no coincide con el total a pagar (${fmt(importeTotal)})
                </p>
              )}
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

      {/* Resumen + botones */}
      {proveedorId && imputaciones.size > 0 && (
        <div className="bg-[var(--primary-ll)] border-2 border-[var(--primary)] rounded-[12px] p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[var(--primary)]">TOTAL A PAGAR</div>
            <div className="text-[28px] font-bold mono text-[var(--primary)] leading-tight">
              ${fmt(importeTotal)}
            </div>
            <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">
              {imputaciones.size} compra{imputaciones.size > 1 ? 's' : ''} · {provSel?.nombre}
            </div>
          </div>
          <DollarSign className="w-16 h-16 text-[var(--primary)] opacity-20" strokeWidth={1.5} />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} disabled={isPending}
          className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center gap-2">
          <X className="w-4 h-4" strokeWidth={2} />
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={isPending || imputaciones.size === 0}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px] flex items-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" strokeWidth={2} />
          {isPending ? 'Guardando...' : 'Registrar pago'}
        </button>
      </div>
    </div>
  );
}
