import Link from 'next/link';
import { Clock } from 'lucide-react';

type Props = {
  titulo: string;
  emoji: string;
  descripcion: string;
};

export function Proximamente({ titulo, emoji, descripcion }: Props) {
  return (
    <div className="grid place-items-center py-16 px-4">
      <div className="max-w-md w-full bg-white border border-[var(--border)] rounded-2xl p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,.06)]">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary-ll)] grid place-items-center text-[34px]">
          {emoji}
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-card-2)] border border-[var(--border)] text-[11px] font-bold text-[var(--fg-muted)] uppercase tracking-wider mb-3">
          <Clock className="w-3 h-3" strokeWidth={2.5} />
          Próximamente
        </span>
        <h1 className="text-[20px] font-extrabold mb-2">{titulo}</h1>
        <p className="text-[13px] text-[var(--fg-muted)] leading-relaxed mb-6">{descripcion}</p>
        <Link href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px]">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
