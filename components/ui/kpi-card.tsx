import { type LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: 'primary' | 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'gray';
};

const ICON_BG: Record<string, { bg: string; color: string }> = {
  primary: { bg: 'bg-[var(--primary-bg)]', color: 'text-[var(--primary)]' },
  emerald: { bg: 'bg-emerald-50', color: 'text-emerald-600' },
  red: { bg: 'bg-red-50', color: 'text-red-600' },
  amber: { bg: 'bg-amber-50', color: 'text-amber-600' },
  blue: { bg: 'bg-blue-50', color: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', color: 'text-purple-600' },
  gray: { bg: 'bg-gray-100', color: 'text-gray-600' },
};

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'primary',
}: Props) {
  const c = ICON_BG[color];

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${c.bg} grid place-items-center shrink-0`}>
            <Icon className={`w-4 h-4 ${c.color}`} strokeWidth={2} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--fg-muted)] font-medium">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 leading-tight text-[var(--fg)]" style={{ fontFamily: 'var(--font-serif)' }}>
            {value}
          </p>
          {sub && (
            <p className="text-xs text-[var(--fg-muted)] mt-1 truncate">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}
