import type { HallucinationRisk } from "@/types/evaluation";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  risk: HallucinationRisk | string | null | undefined;
  className?: string;
}

const config: Record<string, { label: string; text: string; bg: string }> = {
  low:    { label: "low risk",    text: "text-[var(--color-success)]", bg: "bg-[var(--color-success-dim)]" },
  medium: { label: "medium risk", text: "text-[var(--color-warning)]", bg: "bg-[var(--color-warning-dim)]" },
  high:   { label: "high risk",   text: "text-[var(--color-error)]",   bg: "bg-[var(--color-error-dim)]"   },
};

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  if (!risk) return <span className="text-[var(--color-text-muted)] text-[11px]">—</span>;
  const c = config[risk] ?? config.high;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium",
        c.bg,
        c.text,
        className,
      )}
    >
      {c.label}
    </span>
  );
}
