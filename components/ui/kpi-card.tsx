import { type LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: 'primary' | 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'gray';
  trend?: { value: string; up: boolean };
};

const COLOR_MAP: Record<string, { bg: string; iconBg: string; iconColor: string; valueColor: string }> = {
  primary: {
    bg: 'border-l-[var(--primary)]',
    iconBg: 'bg-[var(--primary-bg)]',
    iconColor: 'text-[var(--primary)]',
    valueColor: 'text-[var(--fg)]',
  },
  emerald: {
    bg: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
  },
  red: {
    bg: 'border-l-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    valueColor: 'text-red-700',
  },
  amber: {
    bg: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
  },
  blue: {
    bg: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-700',
  },
  purple: {
    bg: 'border-l-purple-500',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    valueColor: 'text-purple-700',
  },
  gray: {
    bg: 'border-l-gray-400',
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
    <div
      className={`bg-white border border-[var(--border)] border-l-4 ${c.bg} rounded-2xl p-4 shadow-sm hover:shadow-md transition`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} grid place-items-center shrink-0`}>
            <Icon className={`w-5 h-5 ${c.iconColor}`} strokeWidth={1.8} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[var(--fg-muted)] uppercase tracking-wider font-semibold">
            {label}
          </p>
          <p className={`text-2xl font-extrabold mt-0.5 leading-none ${c.valueColor}`}>
            {value}
          </p>
          {sub && (
            <p className="text-xs text-[var(--fg-muted)] mt-1.5 truncate">{sub}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-1.5 font-semibold ${
                trend.up ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {trend.up ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
