'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toggleActivoProveedorAction } from '@/lib/actions/proveedores';

export function ToggleActivoBtn({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(activo
      ? '¿Desactivar este proveedor? Podrás reactivarlo después.'
      : '¿Reactivar este proveedor?'
    )) return;

    startTransition(async () => {
      const res = await toggleActivoProveedorAction(id);
      if (res?.error) alert('Error: ' + res.error);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`px-4 py-2 border rounded-lg font-medium text-[13px] flex items-center gap-2 transition ${
        activo
          ? 'border-[var(--border)] hover:bg-[var(--red-l)] hover:border-[var(--red)] hover:text-[var(--red)]'
          : 'bg-[var(--green-l)] border-[var(--green)] text-[var(--green)] hover:bg-[var(--green-l)]'
      } disabled:opacity-50`}
    >
      {activo ? (
        <>
          <XCircle className="w-4 h-4" strokeWidth={2} />
          {isPending ? '...' : 'Desactivar'}
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
          {isPending ? '...' : 'Reactivar'}
        </>
      )}
    </button>
  );
}
