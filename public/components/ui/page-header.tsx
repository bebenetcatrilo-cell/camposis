import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';

type Breadcrumb = {
  label: string;
  href?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  breadcrumbs?: Breadcrumb[];
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  backHref,
  backLabel,
  actions,
  badge,
}: Props) {
  return (
    <header className="mb-4">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)] hover:text-[var(--primary)] mb-2 transition"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={2} />
          {backLabel ?? 'Volver'}
        </Link>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-semibold leading-tight flex items-center gap-2 flex-wrap">
            {icon && <span className="text-[20px]">{icon}</span>}
            <span>{title}</span>
            {badge}
          </h1>

          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-[12px] text-[var(--fg-muted)] mt-1">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3" strokeWidth={2} />}
                  {b.href ? (
                    <Link href={b.href} className="hover:text-[var(--primary)] transition">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--fg)]">{b.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {subtitle && !breadcrumbs && (
            <p className="text-[var(--fg-muted)] mt-1 text-[12px]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex gap-1.5 flex-wrap items-center">{actions}</div>}
      </div>
    </header>
  );
}
