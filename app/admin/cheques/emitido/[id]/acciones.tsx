'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  cambiarEstadoChequeEmitidoAction,
  eliminarChequeEmitidoAction,
} from '@/lib/actions/cheques';

type Cheque = {
  id: string;
  estado: string;
};

export function AccionesChequeEm({ cheque }: { cheque: Cheque }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function ejecutar(nuevoEstado: string) {
    startTransition(async () => {
      const r = await cambiarEstadoChequeEmitidoAction(cheque.id, nuevoEstado as any);
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  function eliminar() {
    if (!confirm('¿Eliminar este cheque emitido? No se puede deshacer.')) return;
    startTransition(async () => {
      const r = await eliminarChequeEmitidoAction(cheque.id);
      if (r?.error) alert(r.error);
    });
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {cheque.estado === 'emitido' && (
        <button
          onClick={() => ejecutar('entregado')}
          disabled={pending}
          className="px-3 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg font-medium hover:bg-blue-200 transition text-sm disabled:opacity-60"
        >
          🤝 Marcar entregado
        </button>
      )}
      {cheque.estado === 'entregado' && (
        <button
          onClick={() => ejecutar('cobrado')}
          disabled={pending}
          className="px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition text-sm disabled:opacity-60"
        >
          💰 Marcar cobrado
        </button>
      )}
      {(cheque.estado === 'emitido' || cheque.estado === 'entregado') && (
        <button
          onClick={() => {
            if (confirm('¿Anular este cheque emitido?')) ejecutar('anulado');
          }}
          disabled={pending}
          className="px-3 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm disabled:opacity-60"
        >
          ⛔ Anular
        </button>
      )}
      <button
        onClick={eliminar}
        disabled={pending}
        className="px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
      >
        🗑 Eliminar
      </button>
    </div>
  );
}
