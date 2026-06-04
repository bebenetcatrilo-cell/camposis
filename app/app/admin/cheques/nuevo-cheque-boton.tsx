'use client';

import { useState } from 'react';
import { NuevoChequeRecibidoModal } from './nuevo-cheque-rec-modal';
import { NuevoChequeEmitidoModal } from './nuevo-cheque-em-modal';

export function NuevoChequeBoton() {
  const [open, setOpen] = useState(false);
  const [modalRec, setModalRec] = useState(false);
  const [modalEm, setModalEm] = useState(false);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={() => setModalRec(true)}
          className="px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg font-medium hover:bg-blue-200 transition shadow-sm text-sm"
        >
          📥 + Recibido
        </button>
        <button
          onClick={() => setModalEm(true)}
          className="px-4 py-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg font-medium hover:bg-amber-200 transition shadow-sm text-sm"
        >
          📤 + Emitido
        </button>
      </div>

      {modalRec && <NuevoChequeRecibidoModal onClose={() => setModalRec(false)} />}
      {modalEm && <NuevoChequeEmitidoModal onClose={() => setModalEm(false)} />}
    </div>
  );
}
