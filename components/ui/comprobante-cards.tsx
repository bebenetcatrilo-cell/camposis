'use client';

type Tipo = 'A' | 'B' | 'C' | 'X';

type Props = {
  value: Tipo;
  onChange: (tipo: Tipo) => void;
};

const TIPOS: { tipo: Tipo; label: string; sub: string; description: string }[] = [
  {
    tipo: 'A',
    label: 'Factura A',
    sub: 'Responsables',
    description: 'inscriptos',
  },
  {
    tipo: 'B',
    label: 'Factura B',
    sub: 'Monotributistas',
    description: '',
  },
  {
    tipo: 'C',
    label: 'Factura C',
    sub: 'Consumidor',
    description: 'final',
  },
  {
    tipo: 'X',
    label: 'Recibo X',
    sub: 'No válido como',
    description: 'factura',
  },
];

export function ComprobanteCards({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {TIPOS.map((t) => {
        const selected = value === t.tipo;
        return (
          <button
            key={t.tipo}
            type="button"
            onClick={() => onChange(t.tipo)}
            className={`relative p-5 rounded-2xl border-2 transition-all text-center ${
              selected
                ? 'border-[var(--primary)] bg-[var(--primary-bg)] shadow-sm'
                : 'border-[var(--border)] bg-white hover:border-[var(--fg-muted)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {/* Letra grande */}
            <div
              className={`w-12 h-12 mx-auto mb-3 rounded-lg border-2 grid place-items-center font-extrabold text-2xl ${
                selected
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-white'
                  : 'border-[var(--border)] text-[var(--fg-muted)]'
              }`}
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {t.tipo}
            </div>
            {/* Label */}
            <p className={`font-bold text-sm ${selected ? 'text-[var(--primary)]' : 'text-[var(--fg)]'}`}>
              {t.label}
            </p>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5 leading-tight">
              {t.sub}
              {t.description && <><br />{t.description}</>}
            </p>
          </button>
        );
      })}
    </div>
  );
}
