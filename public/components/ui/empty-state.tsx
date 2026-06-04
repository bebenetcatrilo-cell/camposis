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
    <div className="bg-white border border-[var(--border)] rounded-2xl p-10 md:p-14 shadow-sm text-center">
      <div className="inline-flex w-16 h-16 rounded-2xl bg-[var(--primary-bg)] items-center justify-center mb-4">
        {isStringIcon ? (
          <span className="text-3xl">{icon}</span>
        ) : Icon ? (
          <Icon className="w-8 h-8 text-[var(--primary)]" strokeWidth={1.6} />
        ) : (
          <span className="text-3xl">📋</span>
        )}
      </div>
      <h3
        className="text-xl font-bold mb-1"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--fg-muted)] max-w-md mx-auto mt-2">
          {description}
        </p>
      )}
      {action && action.href && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          {action.label}
        </Link>
      )}
      {action && action.onClick && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
