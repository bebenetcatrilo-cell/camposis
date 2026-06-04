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
    <section className="bg-white border border-[var(--border)] rounded-[12px] p-4 md:p-5 shadow-[0_2px_4px_rgba(0,0,0,.06),0_1px_2px_rgba(0,0,0,.04)]">
      <header className="mb-3 pb-3 border-b border-[var(--border)]">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold">
          {number !== undefined && (
            <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-[11px] grid place-items-center font-bold shrink-0">
              {number}
            </span>
          )}
          <span>
            {title}
            {required && <span className="text-[var(--red)] ml-1">*</span>}
          </span>
        </h3>
        {description && (
          <p className="text-[12px] text-[var(--fg-muted)] mt-1 ml-8">{description}</p>
        )}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
