'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { anularCobroAction } from '@/lib/actions/cobros';

export function AnularBtn({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (!confirm('¿Anular este cobro?\n\nEsto va a:\n- Revertir las imputaciones de las facturas\n- Anular el cheque recibido (si hubo)\n- Sumar de nuevo al saldo cta cte del cliente\n\nNo se puede deshacer.')) return;

    startTransition(async () => {
      const res = await anularCobroAction(id);
      if (res?.error) alert('Error: ' + res.error);
      else router.refresh();
    });
  }

  return (
    <button type="button" onClick={handle} disabled={isPending}
      className="px-4 py-2 border border-[var(--red)] text-[var(--red)] rounded-lg font-medium hover:bg-[var(--red-l)] transition text-[13px] flex items-center gap-2 disabled:opacity-50">
      <Ban className="w-4 h-4" strokeWidth={2} />
      {isPending ? '...' : 'Anular cobro'}
    </button>
  );
}
