'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Plus, Trash2, AlertCircle, Wheat, Package } from 'lucide-react';
import { crearCompraAction } from '@/lib/actions/compras';

type Proveedor = { id: string; nombre: string; cuit: string | null; plazo_pago_dias: number | null };
type Silo = { id: string; nombre: string };
type Producto = { id: string; nombre: string };

type Item = {
  id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  iva_porcentaje: number;
  // Stock
  suma_stock: boolean;
  silo_id: string;
  producto_id: string;
  campania: string;
};

type Props = {
  proveedores: Proveedor[];
  silos: Silo[];
  productos: Producto[];
};

const hoy = new Date().toISOString().slice(0, 10);

function newItem(): Item {
  return {
    id: crypto.randomUUID(),
    descripcion: '',
    unidad: 'u',
    cantidad: 1,
    precio_unitario: 0,
    iva_porcentaje: 21,
    suma_stock: false,
    silo_id: '',
    producto_id: '',
    campania: '',
  };
}

function fmt(n: number): string {
  return Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CompraForm({ proveedores, silos, productos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [proveedorId, setProveedorId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [formaPago, setFormaPago] = useState<'efectivo'|'transferencia'|'cheque'|'tarjeta'|'cuenta_corriente'|'otro'>('efectivo');
  const [estado, setEstado] = useState<'pagada'|'pendiente'|'parcial'>('pagada');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<Item[]>([newItem()]);

  // Si elige proveedor con plazo de pago → calcular vencimiento automático
  function onProveedorChange(id: string) {
    setProveedorId(id);
    const p = proveedores.find(x => x.id === id);
    if (p && p.plazo_pago_dias && p.plazo_pago_dias > 0 && estado === 'pendiente') {
      const f = new Date(fecha);
      f.setDate(f.getDate() + p.plazo_pago_dias);
      setFechaVencimiento(f.toISOString().slice(0, 10));
    }
  }

  function actualizar(idx: number, campo: keyof Item, valor: any) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  }

  function toggleStock(idx: number) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const nuevo = !it.suma_stock;
      return {
        ...it,
        suma_stock: nuevo,
        unidad: nuevo ? 'tn' : it.unidad,
      };
    }));
  }

  function agregar() { setItems(prev => [...prev, newItem()]); }
  function eliminar(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const totales = useMemo(() => {
    let sub = 0, iva = 0;
    for (const it of items) {
      const s = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0);
      sub += s;
      iva += s * ((Number(it.iva_porcentaje) || 0) / 100);
    }
    return { sub, iva, total: sub + iva };
  }, [items]);

  const itemsConStock = items.filter(it => it.suma_stock).length;

  function submit() {
    setError(null);
    if (!proveedorId) return setError('Seleccioná un proveedor');
    if (!fecha) return setError('Falta la fecha');
    if (items.length === 0) return setError('Agregá al menos un ítem');

    for (const it of items) {
      if (!it.descripcion.trim()) return setError('Hay ítems sin descripción');
      if (it.cantidad <= 0) return setError(`Cantidad inválida en "${it.descripcion || 'item'}"`);
      if (it.suma_stock && (!it.silo_id || !it.producto_id)) {
        return setError(`"${it.descripcion}" tiene "sumar stock" activo pero falta silo o producto`);
      }
    }

    startTransition(async () => {
      const result = await crearCompraAction({
        proveedor_id: proveedorId,
        numero_factura: numeroFactura.trim() || null,
        tipo_comprobante: tipoComprobante.trim() || null,
        fecha,
        fecha_vencimiento: estado !== 'pagada' && fechaVencimiento ? fechaVencimiento : null,
        forma_pago: formaPago,
        estado,
        notas: notas.trim() || null,
        items: items.map(it => ({
          descripcion: it.descripcion.trim(),
          unidad: it.unidad,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          iva_porcentaje: Number(it.iva_porcentaje),
          suma_stock: it.suma_stock,
          silo_id: it.suma_stock ? it.silo_id : null,
          producto_id: it.suma_stock ? it.producto_id : null,
          campania: it.suma_stock ? (it.campania.trim() || null) : null,
        })),
      });
      if (result && 'error' in result) setError(result.error);
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

      {/* 1. Datos de la factura */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">1</div>
          <h3 className="font-semibold text-[14px]">Datos de la factura</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Proveedor <span className="text-[var(--red)]">*</span>
            </label>
            <select value={proveedorId} onChange={e => onProveedorChange(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">-- Seleccioná proveedor --</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.cuit ? `(${p.cuit})` : ''}
                </option>
              ))}
            </select>
            {proveedores.length === 0 && (
              <p className="text-[11px] text-[var(--orange)] mt-1">
                ⚠️ No tenés proveedores activos. <a href="/admin/proveedores/nuevo" className="underline">Crear uno</a>
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Tipo</label>
            <select value={tipoComprobante} onChange={e => setTipoComprobante(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">Sin tipo</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="M">M</option>
              <option value="X">X (sin valor fiscal)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Nº Factura</label>
            <input type="text" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)}
              placeholder="0001-00012345"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"/>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Fecha <span className="text-[var(--red)]">*</span>
            </label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"/>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Fecha vto. {estado !== 'pagada' ? '(pendiente)' : '(opcional)'}
            </label>
            <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)}
              disabled={estado === 'pagada'}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"/>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Forma de pago</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value as any)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cuenta_corriente">Cuenta corriente</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as any)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="pagada">✅ Pagada</option>
              <option value="pendiente">⏳ Pendiente (a cta. cte.)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Ítems */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">2</div>
            <h3 className="font-semibold text-[14px]">Ítems</h3>
            {itemsConStock > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-ll)] text-[var(--primary)] rounded-[4px] text-[10px] font-bold">
                <Wheat className="w-3 h-3" strokeWidth={2.5} />
                {itemsConStock} suman a stock
              </span>
            )}
          </div>
          <button type="button" onClick={agregar}
            className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-[6px] font-semibold hover:bg-[var(--primary-h)] transition text-[12px] flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Agregar ítem
          </button>
        </div>

        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.id} className="border border-[var(--border)] rounded-[8px] p-3 bg-[var(--bg-card-2)]">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Descripción</label>
                  <input type="text" value={it.descripcion} onChange={e => actualizar(idx, 'descripcion', e.target.value)}
                    placeholder="Ej: Glifosato 20L / Soja 4 tn / Flete..."
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] focus:outline-none focus:border-[var(--primary)] bg-white"/>
                </div>
                <div className="col-span-3 md:col-span-1">
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Unid.</label>
                  <input type="text" value={it.unidad} onChange={e => actualizar(idx, 'unidad', e.target.value)}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono focus:outline-none focus:border-[var(--primary)] bg-white"/>
                </div>
                <div className="col-span-3 md:col-span-1">
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Cant.</label>
                  <input type="number" step="0.001" min="0" value={it.cantidad} onChange={e => actualizar(idx, 'cantidad', Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono text-right focus:outline-none focus:border-[var(--primary)] bg-white"/>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">P. Unit.</label>
                  <input type="number" step="0.01" min="0" value={it.precio_unitario} onChange={e => actualizar(idx, 'precio_unitario', Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono text-right focus:outline-none focus:border-[var(--primary)] bg-white"/>
                </div>
                <div className="col-span-3 md:col-span-1">
                  <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">IVA%</label>
                  <select value={it.iva_porcentaje} onChange={e => actualizar(idx, 'iva_porcentaje', Number(e.target.value))}
                    className="w-full px-1 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono bg-white focus:outline-none focus:border-[var(--primary)]">
                    <option value="0">0%</option>
                    <option value="10.5">10.5%</option>
                    <option value="21">21%</option>
                    <option value="27">27%</option>
                  </select>
                </div>
                <div className="col-span-9 md:col-span-1 text-right">
                  <div className="text-[10px] text-[var(--fg-muted)]">Subt.</div>
                  <div className="mono font-bold text-[12px]">
                    ${fmt((it.cantidad || 0) * (it.precio_unitario || 0))}
                  </div>
                </div>
                <div className="col-span-3 md:col-span-1 flex justify-end">
                  <button type="button" onClick={() => eliminar(idx)} disabled={items.length === 1}
                    className="p-1.5 rounded hover:bg-[var(--red-l)] text-[var(--fg-muted)] hover:text-[var(--red)] transition disabled:opacity-30">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Sumar a stock */}
              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={it.suma_stock} onChange={() => toggleStock(idx)}
                    className="w-4 h-4 accent-[var(--primary)]"/>
                  <span className="text-[11px] font-semibold flex items-center gap-1">
                    <Wheat className="w-3 h-3" strokeWidth={2} />
                    Sumar a stock (cereal a silo)
                  </span>
                </label>

                {it.suma_stock && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 pl-6">
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Silo</label>
                      <select value={it.silo_id} onChange={e => actualizar(idx, 'silo_id', e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] bg-white focus:outline-none focus:border-[var(--primary)]">
                        <option value="">-- Silo --</option>
                        {silos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Producto</label>
                      <select value={it.producto_id} onChange={e => actualizar(idx, 'producto_id', e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] bg-white focus:outline-none focus:border-[var(--primary)]">
                        <option value="">-- Producto --</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--fg-muted)] mb-1">Campaña</label>
                      <input type="text" value={it.campania} onChange={e => actualizar(idx, 'campania', e.target.value)}
                        placeholder="2025/26"
                        className="w-full px-2 py-1.5 border border-[var(--border)] rounded-[5px] text-[12px] mono focus:outline-none focus:border-[var(--primary)] bg-white"/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {itemsConStock > 0 && (
          <div className="mt-3 bg-[#fffbeb] border-l-4 border-[#f59e0b] rounded-[6px] p-3 text-[12px] text-[#78350f]">
            💡 Los {itemsConStock} ítem{itemsConStock > 1 ? 's' : ''} marcados como "Sumar a stock" se van a registrar como <strong>entradas en el silo</strong> al guardar.
          </div>
        )}
      </div>

      {/* 3. Totales y notas */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">3</div>
          <h3 className="font-semibold text-[14px]">Resumen</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={4}
              placeholder="Observaciones de la compra..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)] resize-y"/>
          </div>
          <div className="bg-[var(--bg-card-2)] rounded-[8px] p-4 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--fg-muted)]">Subtotal</span>
              <span className="mono font-semibold">${fmt(totales.sub)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--fg-muted)]">IVA</span>
              <span className="mono font-semibold">${fmt(totales.iva)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-[var(--primary)] pt-2 mt-2 text-[16px] font-bold">
              <span>TOTAL</span>
              <span className="mono text-[var(--primary)]">${fmt(totales.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} disabled={isPending}
          className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center gap-2">
          <X className="w-4 h-4" strokeWidth={2} />
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={isPending}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px] flex items-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" strokeWidth={2} />
          {isPending ? 'Guardando...' : 'Guardar compra'}
        </button>
      </div>
    </div>
  );
}
