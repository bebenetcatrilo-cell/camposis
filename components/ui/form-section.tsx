type Props = {
  number?: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
};

export function FormSection({
  number,
  title,
  description,
  children,
  required,
}: Props) {
  return (
    <section className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h3 className="flex items-center gap-3 text-base font-bold">
          {number !== undefined && (
            <span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white text-sm grid place-items-center font-extrabold shrink-0">
              {number}
            </span>
          )}
          <span>
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </h3>
        {description && (
          <p className="text-xs text-[var(--fg-muted)] mt-1.5 ml-10">{description}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
