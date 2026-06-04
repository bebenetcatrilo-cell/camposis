import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';

type Breadcrumb = {
  label: string;
  href?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  icon?: string; // emoji o icono lucide como string
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
    <header className="mb-6">
      {/* Back link */}
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--primary)] mb-2 transition"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
          {backLabel ?? 'Volver'}
        </Link>
      )}

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] mb-2">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
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

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1
            className="text-3xl tracking-tight font-bold flex items-center gap-3 flex-wrap"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {icon && <span className="text-3xl">{icon}</span>}
            <span>{title}</span>
            {badge}
          </h1>
          {subtitle && (
            <p className="text-[var(--fg-muted)] mt-1 text-sm">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex gap-2 flex-wrap items-center">{actions}</div>}
      </div>
    </header>
  );
}
