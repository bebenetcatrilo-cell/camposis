'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { eliminarMovimientoAction } from '@/lib/actions/silos';

export function EliminarMovimientoBoton({
  movimientoId,
  siloId,
}: {
  movimientoId: string;
  siloId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handle() {
    if (!confirm('¿Eliminar este movimiento? Va a afectar el stock.')) return;
    startTransition(async () => {
      const r = await eliminarMovimientoAction(movimientoId, siloId);
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="text-xs px-2 py-1 border border-red-300 bg-red-50 text-red-700 rounded hover:bg-red-100 transition disabled:opacity-60"
    >
      🗑
    </button>
  );
}
