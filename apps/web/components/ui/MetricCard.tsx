import { cn } from "@/lib/utils";

type MetricVariant = "default" | "success" | "warning" | "error" | "accent";

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Optional secondary descriptor below the value */
  sub?: string;
  /** Subtle visual variant */
  variant?: MetricVariant;
  className?: string;
}

const variantStyles: Record<MetricVariant, string> = {
  default: "",
  success: "border-l-2 border-l-[var(--color-success)]",
  warning: "border-l-2 border-l-[var(--color-warning)]",
  error:   "border-l-2 border-l-[var(--color-error)]",
  accent:  "border-l-2 border-l-[var(--color-accent)]",
};

export function MetricCard({ label, value, sub, variant = "default", className }: MetricCardProps) {
  return (
    <div className={cn("ao-card px-4 py-4", variantStyles[variant], className)}>
      <p className="ao-label mb-2">{label}</p>
      <p className="text-[22px] font-semibold text-[var(--color-text-primary)] leading-none tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{sub}</p>
      )}
    </div>
  );
}
