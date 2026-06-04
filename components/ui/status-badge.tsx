type Color = 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'cyan' | 'gray' | 'primary';

type Props = {
  label: string;
  icon?: string;
  color?: Color;
  size?: 'sm' | 'md';
};

const COLOR_MAP: Record<Color, string> = {
  emerald: 'bg-[#dff6dd] text-[#107c10]',
  amber: 'bg-[#fde7d9] text-[#ca5010]',
  red: 'bg-[#fde7e9] text-[#c42b1c]',
  blue: 'bg-[#cce4f7] text-[#0067c0]',
  purple: 'bg-[#f0d9ff] text-[#7719aa]',
  cyan: 'bg-[#cce4f7] text-[#0067c0]',
  gray: 'bg-[#f0f0f0] text-[#5a5a5a]',
  primary: 'bg-[var(--primary-l)] text-[var(--primary)]',
};

export function StatusBadge({
  label,
  icon,
  color = 'gray',
  size = 'sm',
}: Props) {
  const sizeClass =
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[4px] font-semibold ${COLOR_MAP[color]} ${sizeClass}`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}
