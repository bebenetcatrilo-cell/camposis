'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Ban, Trash2 } from 'lucide-react';
import { cambiarEstadoRemitoAction, eliminarRemitoAction } from '@/lib/actions/remitos';

type Props = { id: string; estado: string; numero: string };

export function AccionesRemito({ id, estado, numero }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function emitir() {
    startTransition(async () => {
      const res = await cambiarEstadoRemitoAction(id, 'emitido');
      if (res?.error) alert('Error: ' + res.error);
      else router.refresh();
    });
  }

  function anular() {
    if (!confirm(`¿Anular el remito ${numero}?\n\nQueda registrado como anulado, no se borra.`)) return;
    startTransition(async () => {
      const res = await cambiarEstadoRemitoAction(id, 'anulado');
      if (res?.error) alert('Error: ' + res.error);
      else router.refresh();
    });
  }

  function eliminar() {
    if (!confirm(`¿Eliminar definitivamente el remito ${numero}?\n\nSolo se puede mientras está en borrador.`)) return;
    startTransition(async () => {
      const res = await eliminarRemitoAction(id);
      if (res?.error) alert('Error: ' + res.error);
    });
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {estado === 'borrador' && (
        <>
          <button type="button" onClick={emitir} disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--green)] text-white rounded-lg font-semibold hover:opacity-90 transition text-sm disabled:opacity-50">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
            {isPending ? '...' : 'Emitir'}
          </button>
          <button type="button" onClick={eliminar} disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--red-l)] hover:text-[var(--red)] transition text-sm disabled:opacity-50">
            <Trash2 className="w-4 h-4" strokeWidth={2} />
            Eliminar
          </button>
        </>
      )}
      {estado === 'emitido' && (
        <button type="button" onClick={anular} disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--red)] text-[var(--red)] rounded-lg font-medium hover:bg-[var(--red-l)] transition text-sm disabled:opacity-50">
          <Ban className="w-4 h-4" strokeWidth={2} />
          {isPending ? '...' : 'Anular'}
        </button>
      )}
    </div>
  );
}
