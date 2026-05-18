import { cn } from "@/lib/utils";

interface LoadingStateProps {
  rows?: number;
  className?: string;
}

function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse flex items-center gap-3 px-4 py-3", className)}>
      <div className="h-2 bg-[var(--color-bg-overlay)] rounded w-24" />
      <div className="h-2 bg-[var(--color-bg-overlay)] rounded flex-1" />
      <div className="h-2 bg-[var(--color-bg-overlay)] rounded w-16" />
      <div className="h-2 bg-[var(--color-bg-overlay)] rounded w-12" />
    </div>
  );
}

export function LoadingState({ rows = 6, className }: LoadingStateProps) {
  return (
    <div className={cn("divide-y divide-[var(--color-border)]", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
    </div>
  );
}
