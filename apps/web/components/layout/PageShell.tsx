import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  /** Optional: constrain width. Defaults to full width with padding. */
  className?: string;
}

/**
 * PageShell wraps the main content area of every page.
 * Provides consistent padding and max-width.
 */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <main className={cn("flex-1 overflow-auto bg-[var(--color-bg-base)]", className)}>
      {children}
    </main>
  );
}
