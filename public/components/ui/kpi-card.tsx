import { type LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: 'primary' | 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'gray';
  trend?: { value: string; up: boolean };
};

const COLOR_MAP: Record<string, { iconBg: string; iconColor: string; valueColor: string }> = {
  primary: {
    iconBg: 'bg-[var(--primary-bg)]',
    iconColor: 'text-[var(--primary)]',
    valueColor: 'text-[var(--fg)]',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
  },
  red: {
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    valueColor: 'text-red-700',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
  },
  blue: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-700',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    valueColor: 'text-purple-700',
  },
  gray: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    valueColor: 'text-[var(--fg)]',
  },
};

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'primary',
  trend,
}: Props) {
  const c = COLOR_MAP[color];

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow transition">
      <div className="flex items-center gap-2 mb-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ${c.iconBg} grid place-items-center shrink-0`}>
            <Icon className={`w-4 h-4 ${c.iconColor}`} strokeWidth={1.8} />
          </div>
        )}
        <p className="text-[11px] text-[var(--fg-muted)] uppercase tracking-[.14em] font-semibold">
          {label}
        </p>
      </div>
      <p className={`text-3xl font-extrabold leading-none ${c.valueColor}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[var(--fg-muted)] mt-2 truncate">{sub}</p>
      )}
      {trend && (
        <p
          className={`text-xs mt-2 font-semibold ${
            trend.up ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {trend.up ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  );
}
