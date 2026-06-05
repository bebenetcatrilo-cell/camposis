'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, AlertCircle } from 'lucide-react';
import { crearMovimientoHaciendaAction } from '@/lib/actions/hacienda';

type Cat = { id: string; nombre: string; color: string };
type Rodeo = { id: string; nombre: string };
type Contraparte = { id: string; nombre: string };

type Props = {
  categorias: Cat[];
  rodeos: Rodeo[];
  proveedores: Contraparte[];
  clientes: Contraparte[];
};

type TipoMov = 'compra' | 'venta' | 'paricion' | 'muerte' | 'consumo' | 'traslado' | 'recategorizacion';

const TIPOS: { v: TipoMov; l: string; i: string; desc: string }[] = [
  { v: 'compra',           l: 'Compra',           i: '🛒', desc: 'Entran animales con costo' },
  { v: 'venta',            l: 'Venta',            i: '💰', desc: 'Salen animales con precio' },
  { v: 'paricion',         l: 'Parición',         i: '🐂', desc: 'Nacen terneros (sin costo)' },
  { v: 'muerte',           l: 'Muerte',           i: '☠️', desc: 'Mortandad / pérdida' },
  { v: 'consumo',          l: 'Consumo',          i: '🍖', desc: 'Faena propia / autoconsumo' },
  { v: 'traslado',         l: 'Traslado',         i: '🔀', desc: 'Cambio de rodeo' },
  { v: 'recategorizacion', l: 'Recategorización', i: '🔄', desc: 'Cambio de categoría (creció)' },
];

const hoy = new Date().toISOString().slice(0, 10);

function fmt(n: number) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MovimientoForm({ categorias, rodeos, proveedores, clientes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoMov>('compra');
  const [fecha, setFecha] = useState(hoy);
  const [categoriaId, setCategoriaId] = useState('');
  const [categoriaDestinoId, setCategoriaDestinoId] = useState('');
  const [rodeoId, setRodeoId] = useState('');
  const [rodeoDestinoId, setRodeoDestinoId] = useState('');
  const [cantidad, setCantidad] = useState(0);
  const [pesoProm, setPesoProm] = useState(0);
  const [precioModo, setPrecioModo] = useState<'kg' | 'cabeza'>('kg');
  const [precio, setPrecio] = useState(0);
  const [proveedorId, setProveedorId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const tipoData = TIPOS.find(t => t.v === tipo)!;

  // Calcular peso total e importe
  const pesoTotal = useMemo(() => cantidad * pesoProm, [cantidad, pesoProm]);
  const importeTotal = useMemo(() => {
    if (precioModo === 'kg') return precio * pesoTotal;
    return precio * cantidad;
  }, [precio, precioModo, pesoTotal, cantidad]);

  // Mostrar campos según tipo
  const muestra = {
    rodeoDestino: tipo === 'traslado',
    categoriaDestino: tipo === 'recategorizacion',
    proveedor: tipo === 'compra',
    cliente: tipo === 'venta',
    precio: tipo === 'compra' || tipo === 'venta',
    motivo: tipo === 'muerte' || tipo === 'consumo',
  };

  function submit() {
    setError(null);
    if (!categoriaId) return setError('Seleccioná la categoría');
    if (cantidad <= 0) return setError('La cantidad debe ser mayor a 0');
    if (muestra.rodeoDestino && !rodeoDestinoId) return setError('Falta rodeo destino');
    if (muestra.rodeoDestino && rodeoDestinoId === rodeoId) return setError('Rodeo origen y destino deben ser distintos');
    if (muestra.categoriaDestino && !categoriaDestinoId) return setError('Falta categoría destino');
    if (muestra.categoriaDestino && categoriaDestinoId === categoriaId) return setError('Categorías origen y destino deben ser distintas');
    if (muestra.proveedor && !proveedorId) return setError('Seleccioná el proveedor');
    if (muestra.cliente && !clienteId) return setError('Seleccioná el cliente');

    startTransition(async () => {
      const res = await crearMovimientoHaciendaAction({
        tipo,
        fecha,
        categoria_id: categoriaId,
        categoria_destino_id: muestra.categoriaDestino ? categoriaDestinoId : null,
        rodeo_id: rodeoId || null,
        rodeo_destino_id: muestra.rodeoDestino ? rodeoDestinoId : null,
        cantidad,
        peso_promedio_kg: pesoProm > 0 ? pesoProm : null,
        precio_por_kg: muestra.precio && precioModo === 'kg' && precio > 0 ? precio : null,
        precio_por_cabeza: muestra.precio && precioModo === 'cabeza' && precio > 0 ? precio : null,
        proveedor_id: muestra.proveedor ? proveedorId : null,
        cliente_id: muestra.cliente ? clienteId : null,
        motivo: motivo.trim() || null,
        observaciones: observaciones.trim() || null,
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

      {/* 1. Tipo */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">1</div>
          <h3 className="font-semibold text-[14px]">Tipo de movimiento</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {TIPOS.map(t => (
            <button key={t.v} type="button" onClick={() => setTipo(t.v)}
              className={`px-2 py-2 border rounded-[6px] text-[11px] font-semibold transition text-center ${
                tipo === t.v ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}>
              <div className="text-[18px]">{t.i}</div>
              <div>{t.l}</div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-2 italic">{tipoData.desc}</p>
      </div>

      {/* 2. Datos básicos */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">2</div>
          <h3 className="font-semibold text-[14px]">Datos</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"/>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Categoría {muestra.categoriaDestino ? 'origen' : ''} <span className="text-[var(--red)]">*</span>
            </label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">-- Seleccioná --</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          {muestra.categoriaDestino && (
            <div>
              <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
                Categoría destino <span className="text-[var(--red)]">*</span>
              </label>
              <select value={categoriaDestinoId} onChange={e => setCategoriaDestinoId(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
                <option value="">-- Seleccioná --</option>
                {categorias.filter(c => c.id !== categoriaId).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          {rodeos.length > 0 && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
                  Rodeo {muestra.rodeoDestino ? 'origen' : '(opcional)'}
                </label>
                <select value={rodeoId} onChange={e => setRodeoId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
                  <option value="">-- Sin rodeo --</option>
                  {rodeos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
              {muestra.rodeoDestino && (
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
                    Rodeo destino <span className="text-[var(--red)]">*</span>
                  </label>
                  <select value={rodeoDestinoId} onChange={e => setRodeoDestinoId(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
                    <option value="">-- Seleccioná --</option>
                    {rodeos.filter(r => r.id !== rodeoId).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Cantidad (cabezas) <span className="text-[var(--red)]">*</span>
            </label>
            <input type="number" min="1" step="1" value={cantidad || ''} onChange={e => setCantidad(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono text-right focus:outline-none focus:border-[var(--primary)]"/>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Peso promedio (kg)</label>
            <input type="number" min="0" step="0.5" value={pesoProm || ''} onChange={e => setPesoProm(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono text-right focus:outline-none focus:border-[var(--primary)]"/>
            {pesoTotal > 0 && <p className="text-[10px] text-[var(--fg-muted)] mt-0.5 mono">Total: {fmt(pesoTotal)} kg</p>}
          </div>
        </div>
      </div>

      {/* 3. Contraparte (compra/venta) */}
      {(muestra.proveedor || muestra.cliente) && (
        <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">3</div>
            <h3 className="font-semibold text-[14px]">{muestra.proveedor ? 'Proveedor' : 'Cliente'}</h3>
          </div>
          {muestra.proveedor && (
            <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">-- Seleccioná proveedor --</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}
          {muestra.cliente && (
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
              <option value="">-- Seleccioná cliente --</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
        </div>
      )}

      {/* 4. Precio (compra/venta) */}
      {muestra.precio && (
        <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">4</div>
            <h3 className="font-semibold text-[14px]">Precio</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Cobrar por</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setPrecioModo('kg')}
                  className={`flex-1 px-3 py-2 rounded-[6px] text-[12px] font-semibold transition ${
                    precioModo === 'kg' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                  }`}>
                  Por kg
                </button>
                <button type="button" onClick={() => setPrecioModo('cabeza')}
                  className={`flex-1 px-3 py-2 rounded-[6px] text-[12px] font-semibold transition ${
                    precioModo === 'cabeza' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                  }`}>
                  Por cabeza
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
                Precio {precioModo === 'kg' ? 'por kg' : 'por cabeza'}
              </label>
              <input type="number" min="0" step="0.01" value={precio || ''} onChange={e => setPrecio(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono text-right focus:outline-none focus:border-[var(--primary)]"/>
            </div>
            <div className="bg-[var(--primary-ll)] border border-[var(--primary)] rounded-[6px] p-2 text-center">
              <p className="text-[10px] text-[var(--primary)] font-semibold uppercase">Total</p>
              <p className="text-[18px] font-bold mono text-[var(--primary)]">${fmt(importeTotal)}</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Motivo (muerte/consumo) + observaciones */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">5</div>
          <h3 className="font-semibold text-[14px]">Detalles</h3>
        </div>

        {muestra.motivo && (
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Motivo</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder={tipo === 'muerte' ? 'Ej: rayo, enfermedad, robo...' : 'Ej: faena casa, evento...'}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"/>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Observaciones (opcional)</label>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)] resize-y"/>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} disabled={isPending}
          className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center gap-2">
          <X className="w-4 h-4" strokeWidth={2} />
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={isPending}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px] flex items-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" strokeWidth={2} />
          {isPending ? 'Guardando...' : 'Guardar movimiento'}
        </button>
      </div>
    </div>
  );
}
