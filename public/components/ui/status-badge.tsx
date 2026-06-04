type Color = 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'cyan' | 'gray' | 'primary';

type Props = {
  label: string;
  icon?: string;
  color?: Color;
  size?: 'sm' | 'md';
};

const COLOR_MAP: Record<Color, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  primary: 'bg-[var(--primary-bg)] text-[var(--primary)] border-[var(--primary-bg)]',
};

export function StatusBadge({
  label,
  icon,
  color = 'gray',
  size = 'sm',
}: Props) {
  const sizeClass =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${COLOR_MAP[color]} ${sizeClass}`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}
