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
    <header className="mb-6">
      {/* Back link */}
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-3 text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--primary)] border border-[var(--border)] rounded-lg hover:bg-white transition bg-transparent"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
          {backLabel ?? 'Volver'}
        </Link>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1
            className="text-[34px] tracking-tight leading-none font-extrabold flex items-center gap-3 flex-wrap"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {icon && <span>{icon}</span>}
            <span>{title}</span>
            {badge}
          </h1>

          {/* Breadcrumbs DEBAJO del título (estilo foto) */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-sm text-[var(--fg-muted)] mt-2">
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

          {subtitle && !breadcrumbs && (
            <p className="text-[var(--fg-muted)] mt-2 text-sm">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex gap-2 flex-wrap items-center">{actions}</div>}
      </div>
    </header>
  );
}
