'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cambiarEstadoPresupuestoAction } from '@/lib/actions/presupuestos';

export function CambiarEstado({ id, estado }: { id: string; estado: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function cambiar(nuevo: 'pendiente' | 'aprobado' | 'rechazado') {
    startTransition(async () => {
      const r = await cambiarEstadoPresupuestoAction(id, nuevo);
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  if (estado === 'pendiente') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => cambiar('aprobado')}
          disabled={pending}
          className="px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition text-sm disabled:opacity-60"
        >
          ✓ Aprobar
        </button>
        <button
          onClick={() => cambiar('rechazado')}
          disabled={pending}
          className="px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
        >
          ✗ Rechazar
        </button>
      </div>
    );
  }

  if (estado === 'aprobado' || estado === 'rechazado') {
    return (
      <button
        onClick={() => cambiar('pendiente')}
        disabled={pending}
        className="px-3 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm disabled:opacity-60"
      >
        ↺ Volver a pendiente
      </button>
    );
  }

  return null;
}
