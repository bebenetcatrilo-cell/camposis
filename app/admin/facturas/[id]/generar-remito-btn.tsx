'use client';

import { useTransition } from 'react';
import { ClipboardList } from 'lucide-react';
import { generarRemitoDeFacturaAction } from '@/lib/actions/remitos';

export function GenerarRemitoBtn({ facturaId }: { facturaId: string }) {
  const [isPending, startTransition] = useTransition();

  function generar() {
    if (!confirm('¿Generar un remito desde esta factura?\n\nSe crea un remito en borrador con el cliente y los ítems (sin precios).')) return;
    startTransition(async () => {
      const res = await generarRemitoDeFacturaAction(facturaId);
      if (res?.error) alert('Error: ' + res.error);
    });
  }

  return (
    <button type="button" onClick={generar} disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm disabled:opacity-50">
      <ClipboardList className="w-3.5 h-3.5" strokeWidth={2} />
      {isPending ? 'Generando...' : 'Generar remito'}
    </button>
  );
}
