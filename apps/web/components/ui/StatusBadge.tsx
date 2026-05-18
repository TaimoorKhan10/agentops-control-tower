import type { TraceStatus } from "@/types/trace";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: TraceStatus | string;
  className?: string;
}

const config: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  success: {
    label: "success",
    dot: "bg-[var(--color-success)]",
    text: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success-dim)]",
  },
  error: {
    label: "error",
    dot: "bg-[var(--color-error)]",
    text: "text-[var(--color-error)]",
    bg: "bg-[var(--color-error-dim)]",
  },
  timeout: {
    label: "timeout",
    dot: "bg-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning-dim)]",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const c = config[status] ?? config.error;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
      {c.label}
    </span>
  );
}
