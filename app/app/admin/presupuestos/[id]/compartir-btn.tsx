'use client';

import { useState } from 'react';
import { MessageCircle, Eye, Check, Copy, X } from 'lucide-react';

type Props = {
  token: string;
  cliente: string;
  numero: string;
  total: number;
};

export function CompartirBtn({ token, cliente, numero, total }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generar URL completa (usa el dominio actual)
  function getUrl() {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/p/${token}`;
  }

  function abrirWhatsApp() {
    const url = getUrl();
    const totalFmt = total.toLocaleString('es-AR', { minimumFractionDigits: 2 });
    const mensaje = encodeURIComponent(
      `Hola! Te paso el presupuesto N° ${numero}\n\nTotal: $${totalFmt}\n\nLo podés ver en este link:\n${url}`
    );
    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  }

  function copiarLink() {
    const url = getUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function verPublico() {
    window.open(getUrl(), '_blank');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[var(--whatsapp)] text-white rounded-lg font-semibold hover:bg-[#1da851] transition text-sm flex items-center gap-2"
      >
        <MessageCircle className="w-4 h-4" strokeWidth={2} />
        Compartir
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-[12px] p-5 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-bold">Compartir presupuesto</h3>
                <p className="text-[12px] text-[var(--fg-muted)] mt-0.5">N° {numero} · {cliente}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-[6px] hover:bg-[var(--bg-hover)] transition"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="bg-[var(--bg-card-2)] border border-[var(--border)] rounded-[6px] p-2.5 mb-3">
              <p className="text-[11px] text-[var(--fg-muted)] mb-1">Link público:</p>
              <p className="text-[11px] mono break-all">{getUrl()}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={abrirWhatsApp}
                className="w-full px-3 py-2.5 bg-[var(--whatsapp)] text-white rounded-[6px] font-semibold hover:bg-[#1da851] transition text-[13px] flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2} />
                Enviar por WhatsApp
              </button>
              <button
                onClick={copiarLink}
                className={`w-full px-3 py-2.5 border rounded-[6px] font-semibold transition text-[13px] flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-[#dff6dd] border-[#107c10] text-[#107c10]'
                    : 'bg-white border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2} />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" strokeWidth={2} />
                    Copiar link
                  </>
                )}
              </button>
              <button
                onClick={verPublico}
                className="w-full px-3 py-2.5 border border-[var(--border)] bg-white rounded-[6px] font-semibold hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" strokeWidth={2} />
                Vista previa
              </button>
            </div>

            <p className="text-[10px] text-[var(--fg-subtle)] mt-3 text-center">
              Cualquier persona con el link puede ver el presupuesto sin necesidad de cuenta.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
