import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message?: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({ message, retry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className,
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-[var(--color-error-dim)] border border-[var(--color-error)] border-opacity-30 flex items-center justify-center mb-4">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-error)]">
          <path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M7 5.5V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
        </svg>
      </div>
      <p className="text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
        Failed to load data
      </p>
      <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">
        {message ?? "An unexpected error occurred. Check that the API is running."}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="mt-4 px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
