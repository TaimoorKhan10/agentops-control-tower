import { cn } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  value: number | null | undefined;
  /** Optional: override bar color. Defaults to semantic coloring by value. */
  color?: string;
  className?: string;
}

function getBarColor(value: number): string {
  if (value >= 0.75) return "bg-[var(--color-success)]";
  if (value >= 0.45) return "bg-[var(--color-warning)]";
  return "bg-[var(--color-error)]";
}

export function ScoreBar({ label, value, color, className }: ScoreBarProps) {
  const pct = value != null ? Math.round(value * 100) : null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-text-secondary)]">{label}</span>
        <span className="text-[11px] font-medium text-[var(--color-text-primary)] tabular-nums">
          {pct != null ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-[var(--color-bg-overlay)] overflow-hidden">
        {pct != null && (
          <div
            className={cn("h-full rounded-full transition-all duration-300", color ?? getBarColor(value!))}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
