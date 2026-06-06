'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { recalcularSaldosClientesAction } from '@/lib/actions/clientes';

export function RecalcularSaldosBtn() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function recalcular() {
    if (!confirm('¿Recalcular los saldos de todos los clientes desde sus facturas?\n\nEl saldo de cada cliente pasa a ser la suma de lo que se le facturó y todavía no pagó.')) return;
    startTransition(async () => {
      const res = await recalcularSaldosClientesAction();
      if (res?.error) alert('Error: ' + res.error);
      else {
        router.refresh();
        alert('Saldos recalculados ✅');
      }
    });
  }

  return (
    <button type="button" onClick={recalcular} disabled={isPending}
      className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm disabled:opacity-60">
      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} strokeWidth={2} />
      {isPending ? 'Recalculando...' : 'Recalcular saldos'}
    </button>
  );
}
