interface TopBarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, description, actions }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] sticky top-0 z-10">
      <div>
        <h1 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{title}</h1>
        {description && (
          <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
