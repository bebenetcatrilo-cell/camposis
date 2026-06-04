'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-[var(--primary)] text-white rounded-[6px] text-[13px] font-semibold hover:bg-[var(--primary-h)] transition flex items-center gap-2"
    >
      <Printer className="w-4 h-4" strokeWidth={2} />
      Imprimir / Guardar PDF
    </button>
  );
}
