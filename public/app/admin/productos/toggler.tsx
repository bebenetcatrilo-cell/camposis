'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleProductoActivoAction } from '@/lib/actions/productos';

export function TogglerActivo({ id, activo }: { id: string; activo: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const r = await toggleProductoActivoAction(id, !activo);
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`text-xs px-3 py-1.5 rounded border transition disabled:opacity-60 ${
        activo
          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      }`}
    >
      {pending ? '...' : activo ? '○ Desactivar' : '✓ Activar'}
    </button>
  );
}
