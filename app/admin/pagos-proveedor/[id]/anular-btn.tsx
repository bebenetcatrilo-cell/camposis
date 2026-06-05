'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { anularPagoProveedorAction } from '@/lib/actions/pagos-proveedor';

export function AnularBtn({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (!confirm('¿Anular este pago?\n\nEsto va a:\n- Revertir las imputaciones de las compras\n- Anular el cheque emitido (si hubo)\n- Devolver el cheque endosado a cartera (si hubo)\n- Sumar de nuevo al saldo de cta cte\n\nNo se puede deshacer.')) return;

    startTransition(async () => {
      const res = await anularPagoProveedorAction(id);
      if (res?.error) alert('Error: ' + res.error);
      else router.refresh();
    });
  }

  return (
    <button type="button" onClick={handle} disabled={isPending}
      className="px-4 py-2 border border-[var(--red)] text-[var(--red)] rounded-lg font-medium hover:bg-[var(--red-l)] transition text-[13px] flex items-center gap-2 disabled:opacity-50">
      <Ban className="w-4 h-4" strokeWidth={2} />
      {isPending ? '...' : 'Anular pago'}
    </button>
  );
}
