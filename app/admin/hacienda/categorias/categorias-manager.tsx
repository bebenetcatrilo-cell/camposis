'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { crearCategoriaHaciendaAction, eliminarCategoriaHaciendaAction } from '@/lib/actions/hacienda';

type Cat = { id: string; nombre: string; sexo: string | null; color: string; orden: number; activo: boolean };

export function CategoriasManager({ categorias, esAdmin }: { categorias: Cat[]; esAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState('');
  const [color, setColor] = useState('#888888');
  const [error, setError] = useState<string | null>(null);

  function agregar() {
    setError(null);
    if (!nombre.trim()) return setError('Falta el nombre');
    const fd = new FormData();
    fd.set('nombre', nombre.trim());
    fd.set('sexo', sexo);
    fd.set('color', color);
    startTransition(async () => {
      const res = await crearCategoriaHaciendaAction(fd);
      if (res?.error) setError(res.error);
      else { setNombre(''); router.refresh(); }
    });
  }

  function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?\nLos movimientos históricos no se borran, pero la categoría no se podrá usar de nuevo.`)) return;
    startTransition(async () => {
      const res = await eliminarCategoriaHaciendaAction(id);
      if (res?.error) alert('Error: ' + res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {esAdmin && (
        <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
          <h3 className="font-semibold text-[14px] mb-3">Agregar nueva categoría</h3>
          {error && <p className="text-[12px] text-[var(--red)] mb-2">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Vacas con cría"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"/>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Sexo</label>
              <select value={sexo} onChange={e => setSexo(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]">
                <option value="">No aplica</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Color</label>
              <div className="flex gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-12 h-9 rounded border border-[var(--border)] cursor-pointer"/>
                <button type="button" onClick={agregar} disabled={isPending}
                  className="flex-1 px-3 py-2 bg-[var(--primary)] text-white rounded-[6px] font-semibold hover:bg-[var(--primary-h)] transition text-[12px] flex items-center justify-center gap-1">
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--bg-hover)]">
            <tr>
              <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Color</th>
              <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Nombre</th>
              <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Sexo</th>
              <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Estado</th>
              {esAdmin && <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {categorias.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-[var(--fg-muted)]">No hay categorías cargadas</td></tr>
            ) : categorias.map(c => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-2">
                  <div className="w-6 h-6 rounded" style={{ background: c.color }}></div>
                </td>
                <td className="px-4 py-2 font-semibold">{c.nombre}</td>
                <td className="px-4 py-2 text-[12px] text-[var(--fg-muted)] capitalize">{c.sexo ?? '-'}</td>
                <td className="px-4 py-2">
                  {c.activo ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--green-l)] text-[var(--green)] rounded">ACTIVA</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--bg-card-3)] text-[var(--fg-muted)] rounded">INACTIVA</span>
                  )}
                </td>
                {esAdmin && (
                  <td className="px-4 py-2 text-right">
                    {c.activo && (
                      <button onClick={() => eliminar(c.id, c.nombre)} disabled={isPending}
                        className="p-1.5 rounded hover:bg-[var(--red-l)] text-[var(--fg-muted)] hover:text-[var(--red)] transition disabled:opacity-50">
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
