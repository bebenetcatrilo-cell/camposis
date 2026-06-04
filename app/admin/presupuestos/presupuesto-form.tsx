'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearPresupuestoAction, editarPresupuestoAction, eliminarPresupuestoAction } from '@/lib/actions/presupuestos';

type Cliente = {
  id: string;
  nombre: string;
  cuit: string | null;
  condicion_iva: string;
  direccion: string | null;
  localidad: string | null;
};

type Producto = {
  id: string;
  nombre: string;
  tipo: 'cereal' | 'hacienda';
  unidad: string;
  especie: string | null;
  variedad: string | null;
  campania: string | null;
  categoria: string | null;
  raza: string | null;
};

type Item = {
  id: string;            // ID local para React keys
  producto_id: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
};

type Presupuesto = {
  id: string;
  cliente_id: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  concepto: string | null;
  iva_porcentaje: number;
  notas: string | null;
  estado: string;
  items: Array<{
    producto_id: string | null;
    descripcion: string;
    unidad: string | null;
    cantidad: number;
    precio_unitario: number;
  }>;
};

function uid() {
  return Math.random().toString(36).substring(2, 9);
}

function formatARS(n: number): string {
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PresupuestoForm({
  clientes,
  productos,
  presupuesto,
}: {
  clientes: Cliente[];
  productos: Producto[];
  presupuesto?: Presupuesto;
}) {
  const esEdicion = !!presupuesto;
  const router = useRouter();

  // ── Estado ──
  const [clienteId, setClienteId] = useState(presupuesto?.cliente_id ?? '');
  const [fecha, setFecha] = useState(presupuesto?.fecha ?? new Date().toISOString().slice(0, 10));
  const [fechaVenc, setFechaVenc] = useState(presupuesto?.fecha_vencimiento ?? '');
  const [concepto, setConcepto] = useState(presupuesto?.concepto ?? '');
  const [ivaPct, setIvaPct] = useState<number | ''>(presupuesto?.iva_porcentaje ?? '');
  const [notas, setNotas] = useState(presupuesto?.notas ?? '');

  const [items, setItems] = useState<Item[]>(() => {
    if (presupuesto?.items?.length) {
      return presupuesto.items.map((it) => ({
        id: uid(),
        producto_id: it.producto_id,
        descripcion: it.descripcion,
        unidad: it.unidad ?? '',
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
      }));
    }
    return [];
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Buscador producto
  const [busqueda, setBusqueda] = useState('');

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    return productos.filter((p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.especie?.toLowerCase().includes(q) ||
      p.variedad?.toLowerCase().includes(q) ||
      p.categoria?.toLowerCase().includes(q) ||
      p.raza?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [busqueda, productos]);

  // ── Totales calculados ──
  const subtotal = items.reduce((s, it) => s + (it.cantidad * it.precio_unitario), 0);
  const ivaNum = typeof ivaPct === 'number' ? ivaPct : 0;
  const ivaMonto = subtotal * (ivaNum / 100);
  const total = subtotal + ivaMonto;

  // ── Cliente seleccionado info ──
  const clienteSel = clientes.find((c) => c.id === clienteId);

  // ── Funciones ──
  function agregarProducto(p: Producto) {
    const desc = construirDescripcion(p);
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        producto_id: p.id,
        descripcion: desc,
        unidad: p.unidad,
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
    setBusqueda('');
  }

  function agregarItemLibre() {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        producto_id: null,
        descripcion: '',
        unidad: 'tn',
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
  }

  function actualizarItem(id: string, campo: keyof Item, valor: any) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it))
    );
  }

  function eliminarItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function construirDescripcion(p: Producto): string {
    const partes: string[] = [p.nombre];
    if (p.tipo === 'cereal' && p.campania) partes.push(`Campaña ${p.campania}`);
    if (p.variedad) partes.push(p.variedad);
    if (p.raza) partes.push(p.raza);
    return partes.join(' · ');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!clienteId) return setError('Seleccioná un cliente');
    if (items.length === 0) return setError('Agregá al menos un ítem');

    for (const it of items) {
      if (!it.descripcion.trim()) return setError('Hay ítems sin descripción');
      if (it.cantidad < 0) return setError('Hay cantidades negativas');
      if (it.precio_unitario < 0) return setError('Hay precios negativos');
    }

    setLoading(true);
    const formData = new FormData();
    formData.set('cliente_id', clienteId);
    formData.set('fecha', fecha);
    if (fechaVenc) formData.set('fecha_vencimiento', fechaVenc);
    formData.set('concepto', concepto);
    formData.set('iva_porcentaje', String(ivaNum));
    formData.set('notas', notas);
    formData.set(
      'items_json',
      JSON.stringify(items.map((it) => ({
        producto_id: it.producto_id,
        descripcion: it.descripcion,
        unidad: it.unidad,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
      })))
    );

    if (esEdicion) formData.set('id', presupuesto!.id);

    const r = esEdicion
      ? await editarPresupuestoAction(formData)
      : await crearPresupuestoAction(formData);

    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
  }

  function handleEliminar() {
    if (!presupuesto) return;
    if (!confirm(`¿Eliminar el presupuesto #${esEdicion ? '' : ''}?\n\nNo se puede deshacer.`)) return;
    startTransition(async () => {
      const r = await eliminarPresupuestoAction(presupuesto.id);
      if (r?.error) alert(r.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── ENCABEZADO ── */}
      <section className="space-y-4">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          📋 Encabezado
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1.5">Cliente *</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="">— Seleccionar cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.cuit ? ` · ${c.cuit}` : ''}
              </option>
            ))}
          </select>
          {clientes.length === 0 && (
            <p className="text-xs text-amber-700 mt-1">
              ⚠️ No tenés clientes cargados. Andá a "Clientes" y cargá al menos uno.
            </p>
          )}
        </div>

        {clienteSel && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-blue-900">📋 Datos fiscales del cliente</p>
            <p className="text-blue-800">
              CUIT: <strong>{clienteSel.cuit ?? '—'}</strong> · IVA: <strong>{clienteSel.condicion_iva.replace('_', ' ')}</strong>
            </p>
            {(clienteSel.direccion || clienteSel.localidad) && (
              <p className="text-blue-800">
                {[clienteSel.direccion, clienteSel.localidad].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Fecha *</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Vencimiento (opcional)</label>
            <input
              type="date"
              value={fechaVenc}
              onChange={(e) => setFechaVenc(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Concepto / descripción general</label>
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: Venta soja 2024/25"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
      </section>

      {/* ── ÍTEMS ── */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          🛒 Ítems del presupuesto
        </h3>

        {/* Buscador */}
        <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg p-3 space-y-2">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            🔍 Buscar producto del catálogo
          </label>
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Soja, trigo, ternero..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
            {productosFiltrados.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {productosFiltrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => agregarProducto(p)}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--bg-hover)] border-b border-[var(--border)] last:border-b-0"
                  >
                    <div className="text-sm font-medium">
                      {p.tipo === 'cereal' ? '🌾' : '🐄'} {p.nombre}
                    </div>
                    <div className="text-xs text-[var(--fg-muted)]">
                      {p.tipo === 'cereal'
                        ? [p.variedad, p.campania].filter(Boolean).join(' · ')
                        : [p.categoria, p.raza].filter(Boolean).join(' · ')}
                      {' '} · {p.unidad}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={agregarItemLibre}
            className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-white transition"
          >
            ✍️ Agregar ítem libre (sin producto del catálogo)
          </button>
        </div>

        {/* Lista de ítems */}
        {items.length === 0 ? (
          <p className="text-center text-[var(--fg-muted)] py-6 text-sm">
            Sin ítems. Buscá un producto o agregá uno libre.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="bg-white border border-[var(--border)] rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--fg-muted)]">
                    #{idx + 1}{it.producto_id ? ' · 📦 Catálogo' : ' · ✍️ Libre'}
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminarItem(it.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                    title="Eliminar ítem"
                  >
                    🗑 Quitar
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={it.descripcion}
                  onChange={(e) => actualizarItem(it.id, 'descripcion', e.target.value)}
                  placeholder="Descripción del ítem"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                />

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-[var(--fg-muted)] mb-0.5">Cantidad</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={it.cantidad}
                      onChange={(e) => actualizarItem(it.id, 'cantidad', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--fg-muted)] mb-0.5">Unidad</label>
                    <select
                      value={it.unidad}
                      onChange={(e) => actualizarItem(it.id, 'unidad', e.target.value)}
                      className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="tn">tn</option>
                      <option value="kg">kg</option>
                      <option value="qq">qq</option>
                      <option value="cabezas">cabezas</option>
                      <option value="unidad">u.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--fg-muted)] mb-0.5">Precio unit.</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={it.precio_unitario}
                      onChange={(e) => actualizarItem(it.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--fg-muted)] mb-0.5">Subtotal</label>
                    <div className="px-2 py-1.5 bg-[var(--bg-hover)] rounded text-sm font-semibold text-right">
                      ${formatARS(it.cantidad * it.precio_unitario)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── TOTALES ── */}
      <section className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm">Subtotal</span>
          <span className="font-semibold">${formatARS(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">IVA</span>
            <select
              value={String(ivaPct)}
              onChange={(e) => {
                const v = e.target.value;
                setIvaPct(v === '' ? '' : parseFloat(v));
              }}
              className="px-2 py-1 border border-[var(--border)] rounded text-xs focus:outline-none"
            >
              <option value="">— elegir IVA —</option>
              <option value="0">Sin IVA (0%)</option>
              <option value="10.5">10.5%</option>
              <option value="21">21%</option>
              <option value="27">27%</option>
            </select>
          </div>
          <span className="font-semibold">${formatARS(ivaMonto)}</span>
        </div>
        <div className="border-t-2 border-[var(--border)] pt-3 flex justify-between items-center">
          <span className="text-lg font-extrabold">TOTAL</span>
          <span className="text-2xl font-extrabold text-[var(--primary)]">${formatARS(total)}</span>
        </div>
      </section>

      {/* NOTAS */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Notas / condiciones</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Validez 15 días, forma de pago, observaciones..."
          className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
        />
      </div>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-between pt-4 border-t border-[var(--border)] flex-wrap">
        {esEdicion ? (
          <button
            type="button"
            onClick={handleEliminar}
            disabled={pending || loading}
            className="px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
          >
            🗑 Eliminar
          </button>
        ) : <div></div>}
        <div className="flex gap-3">
          <a
            href={esEdicion ? `/admin/presupuestos/${presupuesto.id}` : '/admin/presupuestos'}
            className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear presupuesto'}
          </button>
        </div>
      </div>
    </form>
  );
}
