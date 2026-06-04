import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon | string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
};

export function EmptyState({ icon, title, description, action }: Props) {
  const isStringIcon = typeof icon === 'string';
  const Icon = !isStringIcon ? icon : null;

  return (
    <div className="bg-white border border-[var(--border)] rounded-[12px] p-8 md:p-10 shadow-[0_2px_4px_rgba(0,0,0,.06)] text-center">
      <div className="inline-flex w-12 h-12 rounded-[12px] bg-[var(--bg-card-3)] items-center justify-center mb-3">
        {isStringIcon ? (
          <span className="text-2xl">{icon}</span>
        ) : Icon ? (
          <Icon className="w-6 h-6 text-[var(--fg-muted)]" strokeWidth={1.6} />
        ) : (
          <span className="text-2xl">📋</span>
        )}
      </div>
      <h3 className="text-[15px] font-semibold mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-[var(--fg-muted)] max-w-md mx-auto mt-1">
          {description}
        </p>
      )}
      {action && action.href && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-[var(--primary)] text-white rounded-[6px] font-medium hover:bg-[var(--primary-h)] transition text-[13px]"
        >
          {action.label}
        </Link>
      )}
      {action && action.onClick && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-[var(--primary)] text-white rounded-[6px] font-medium hover:bg-[var(--primary-h)] transition text-[13px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
