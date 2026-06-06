'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, AlertCircle, Plus, Trash2, Package } from 'lucide-react';
import { crearRemitoAction } from '@/lib/actions/remitos';

type Cliente = { id: string; nombre: string };
type Producto = { id: string; nombre: string; unidad: string };
type Item = { producto_id: string; descripcion: string; unidad: string; cantidad: string };

type Props = { clientes: Cliente[]; productos: Producto[] };

const hoy = new Date().toISOString().slice(0, 10);

const itemVacio = (): Item => ({ producto_id: '', descripcion: '', unidad: '', cantidad: '' });

export function RemitoForm({ clientes, productos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [transporte, setTransporte] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<Item[]>([itemVacio()]);

  function setItem(idx: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function elegirProducto(idx: number, productoId: string) {
    const p = productos.find(x => x.id === productoId);
    if (p) setItem(idx, { producto_id: productoId, descripcion: p.nombre, unidad: p.unidad });
    else setItem(idx, { producto_id: '' });
  }

  function agregarItem() { setItems(prev => [...prev, itemVacio()]); }
  function quitarItem(idx: number) { setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)); }

  function submit() {
    setError(null);
    if (!clienteId) return setError('Seleccioná un cliente');
    const itemsValidos = items.filter(it => it.descripcion.trim() && Number(it.cantidad) > 0);
    if (itemsValidos.length === 0) return setError('Cargá al menos un ítem con descripción y cantidad');

    startTransition(async () => {
      const res = await crearRemitoAction({
        cliente_id: clienteId,
        fecha,
        transporte: transporte.trim() || null,
        observaciones: observaciones.trim() || null,
        items: itemsValidos.map(it => ({
          producto_id: it.producto_id || null,
          descripcion: it.descripcion.trim(),
          unidad: it.unidad.trim() || null,
          cantidad: Number(it.cantidad),
        })),
      });
      if (res && 'error' in res) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-[var(--red-l)] border border-[var(--red)] rounded-[6px] p-3 text-[13px] text-[var(--red)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* Cliente y datos */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Cliente <span className="text-[var(--red)]">*</span>
            </label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">-- Seleccionar --</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Fecha <span className="text-[var(--red)]">*</span>
            </label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Transporte / chofer (opcional)</label>
          <input type="text" value={transporte} onChange={e => setTransporte(e.target.value)}
            placeholder="Transportista, patente, chofer..."
            className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]" />
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
            <h3 className="font-semibold text-[14px]">Mercadería a entregar</h3>
          </div>
          <button type="button" onClick={agregarItem}
            className="px-3 py-1.5 border border-[var(--border)] rounded-[6px] hover:bg-[var(--bg-hover)] transition text-[12px] font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Agregar ítem
          </button>
        </div>

        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-4">
                {idx === 0 && <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Producto (opcional)</label>}
                <select value={it.producto_id} onChange={e => elegirProducto(idx, e.target.value)}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] bg-white focus:outline-none focus:border-[var(--primary)]">
                  <option value="">— libre —</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-6 md:col-span-4">
                {idx === 0 && <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Descripción *</label>}
                <input type="text" value={it.descripcion} onChange={e => setItem(idx, { descripcion: e.target.value })}
                  placeholder="Detalle"
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div className="col-span-3 md:col-span-2">
                {idx === 0 && <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Cant. *</label>}
                <input type="number" step="0.001" min="0" value={it.cantidad} onChange={e => setItem(idx, { cantidad: e.target.value })}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono text-right focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div className="col-span-2 md:col-span-1">
                {idx === 0 && <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Unid.</label>}
                <input type="text" value={it.unidad} onChange={e => setItem(idx, { unidad: e.target.value })}
                  placeholder="kg"
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div className="col-span-1 flex justify-center pb-1">
                <button type="button" onClick={() => quitarItem(idx)} disabled={items.length === 1}
                  className="p-1.5 rounded hover:bg-[var(--red-l)] text-[var(--fg-muted)] hover:text-[var(--red)] transition disabled:opacity-30">
                  <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-3">📦 El remito solo lleva cantidades, sin precios. No afecta el stock.</p>
      </div>

      <div className="mt-1">
        <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Observaciones (opcional)</label>
        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)] resize-y" />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} disabled={isPending}
          className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center gap-2">
          <X className="w-4 h-4" strokeWidth={2} /> Cancelar
        </button>
        <button type="button" onClick={submit} disabled={isPending}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px] flex items-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" strokeWidth={2} />
          {isPending ? 'Guardando...' : 'Crear remito'}
        </button>
      </div>
    </div>
  );
}
