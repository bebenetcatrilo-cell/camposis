'use client';

import { useState } from 'react';
import { Eye, Printer, MessageCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  presupuestoId: string;
  numero: string;
  cliente: string;
  total: number;
  tokenPublico: string | null;
};

export function AccionesRapidas({ presupuestoId, numero, cliente, total, tokenPublico }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'imprimir' | null>(null);

  function verDetalle() {
    router.push(`/admin/presupuestos/${presupuestoId}`);
  }

  function compartirWhatsApp() {
    if (!tokenPublico) {
      alert('Este presupuesto no tiene link público. Entrá al detalle para regenerarlo.');
      return;
    }
    const url = `${window.location.origin}/p/${tokenPublico}`;
    const totalFmt = total.toLocaleString('es-AR', { minimumFractionDigits: 2 });
    const mensaje = encodeURIComponent(
      `Hola! Te paso el presupuesto N° ${numero}\n\nTotal: $${totalFmt}\n\nLo podés ver en este link:\n${url}`
    );
    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  }

  async function imprimir() {
    setLoading('imprimir');
    try {
      const res = await fetch(`/api/presupuestos/${presupuestoId}/print`);
      if (!res.ok) {
        const errText = await res.text();
        alert('Error al generar impresión: ' + errText);
        setLoading(null);
        return;
      }
      const html = await res.text();
      const win = window.open('', '_blank');
      if (!win) {
        alert('El navegador bloqueó la ventana. Habilitá pop-ups para este sitio.');
        setLoading(null);
        return;
      }
      win.document.write(html);
      win.document.close();
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'desconocido'));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-1 justify-end">
      <button
        type="button"
        onClick={verDetalle}
        title="Ver detalle"
        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--fg-muted)] hover:text-[var(--primary)] transition"
      >
        <Eye className="w-4 h-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={imprimir}
        disabled={loading === 'imprimir'}
        title="Imprimir / PDF"
        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--fg-muted)] hover:text-[var(--primary)] transition disabled:opacity-50"
      >
        {loading === 'imprimir' ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
        ) : (
          <Printer className="w-4 h-4" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={compartirWhatsApp}
        title="Compartir por WhatsApp"
        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--fg-muted)] hover:text-[#25D366] transition"
      >
        <MessageCircle className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}
