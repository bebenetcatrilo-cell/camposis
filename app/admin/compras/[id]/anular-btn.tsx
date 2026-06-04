'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { anularCompraAction } from '@/lib/actions/compras';

export function AnularBtn({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (!confirm('¿Anular esta compra?\n\nEsto va a:\n- Revertir las entradas de silo (si hay)\n- Sacar el saldo de cta cte del proveedor\n\nNo se puede deshacer.')) return;

    startTransition(async () => {
      const res = await anularCompraAction(id);
      if (res?.error) alert('Error: ' + res.error);
      else router.refresh();
    });
  }

  return (
    <button type="button" onClick={handle} disabled={isPending}
      className="px-4 py-2 border border-[var(--red)] text-[var(--red)] rounded-lg font-medium hover:bg-[var(--red-l)] transition text-[13px] flex items-center gap-2 disabled:opacity-50">
      <Ban className="w-4 h-4" strokeWidth={2} />
      {isPending ? '...' : 'Anular compra'}
    </button>
  );
}
