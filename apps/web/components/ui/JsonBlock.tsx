"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface JsonBlockProps {
  data: unknown;
  title?: string;
  /** If true, renders collapsed by default with a toggle. */
  collapsible?: boolean;
  className?: string;
}

export function JsonBlock({ data, title, collapsible = false, className }: JsonBlockProps) {
  const [open, setOpen] = useState(!collapsible);
  const json = JSON.stringify(data, null, 2);

  return (
    <div className={cn("ao-card overflow-hidden", className)}>
      {title && (
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]",
            collapsible && "cursor-pointer hover:bg-[var(--color-bg-raised)] select-none",
          )}
          onClick={() => collapsible && setOpen((o) => !o)}
        >
          <span className="ao-label">{title}</span>
          {collapsible && (
            <span className="text-[var(--color-text-muted)] text-xs">
              {open ? "▲ collapse" : "▼ expand"}
            </span>
          )}
        </div>
      )}
      {open && (
        <pre className="ao-mono p-3 overflow-auto text-[var(--color-text-secondary)] text-[11.5px] leading-relaxed max-h-96">
          {json}
        </pre>
      )}
    </div>
  );
}
