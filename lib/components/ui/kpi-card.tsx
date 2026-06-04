import { type LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: 'primary' | 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'gray';
};

const COLOR_TOP: Record<string, string> = {
  primary: 'from-[var(--primary)] to-[#34a04d]',
  emerald: 'from-[#107c10] to-[#54b054]',
  red: 'from-[#c42b1c] to-[#e45f52]',
  amber: 'from-[#ca5010] to-[#e87c3e]',
  blue: 'from-[#0067c0] to-[#2d9de8]',
  purple: 'from-[#7719aa] to-[#9d4dd0]',
  gray: 'from-[#5a5a5a] to-[#8a8a8a]',
};

const VALUE_COLOR: Record<string, string> = {
  primary: 'text-[var(--primary)]',
  emerald: 'text-[#107c10]',
  red: 'text-[#c42b1c]',
  amber: 'text-[#ca5010]',
  blue: 'text-[#0067c0]',
  purple: 'text-[#7719aa]',
  gray: 'text-[var(--fg)]',
};

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'primary',
}: Props) {
  return (
    <div className="relative bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06),0_1px_2px_rgba(0,0,0,.04)] overflow-hidden">
      {/* Línea de color arriba estilo BBNet */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${COLOR_TOP[color]} rounded-t-[12px]`} />

      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-medium text-[var(--fg-muted)]">
          {label}
        </p>
        {Icon && (
          <Icon className={`w-4 h-4 ${VALUE_COLOR[color]} opacity-70`} strokeWidth={1.8} />
        )}
      </div>
      <p className={`text-[24px] font-bold leading-none ${VALUE_COLOR[color]} mono`}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-[var(--fg-muted)] mt-1.5">{sub}</p>
      )}
    </div>
  );
}
