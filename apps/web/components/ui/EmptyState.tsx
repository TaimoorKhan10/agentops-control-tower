import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className,
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-overlay)] border border-[var(--color-border)] flex items-center justify-center mb-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--color-text-muted)]">
          <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </div>
      <p className="text-[13px] font-medium text-[var(--color-text-primary)] mb-1">{title}</p>
      {description && (
        <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
