"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function ActivityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,7 4,3 6,9 8,5 10,8 13,7" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="1" y1="3.5" x2="13" y2="3.5" /><line x1="1" y1="7" x2="13" y2="7" /><line x1="1" y1="10.5" x2="13" y2="10.5" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,7 5.5,10.5 12,3.5" />
    </svg>
  );
}
function FlaskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 1h4M4 1v5L1.5 11a1 1 0 00.9 1.5h9.2a1 1 0 00.9-1.5L10 6V1" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3,1.5 13,7 3,12.5" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="2.5" />
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M11.4 2.6l-1.1 1.1M3.7 10.3l-1.1 1.1" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",   label: "Dashboard",        icon: <ActivityIcon /> },
  { href: "/traces",      label: "Traces",           icon: <ListIcon /> },
  { href: "/evaluations", label: "Evaluations",      icon: <StarIcon /> },
  { href: "/reviews",     label: "Review Queue",     icon: <CheckIcon /> },
  { href: "/regression",  label: "Regression Tests", icon: <FlaskIcon /> },
  { href: "/demo-rag",    label: "Demo RAG",         icon: <PlayIcon /> },
  { href: "/settings",    label: "Settings",         icon: <GearIcon /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-[220px] flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-surface)] h-screen sticky top-0">
      {/* Wordmark */}
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2.5">
        <div className="w-6 h-6 rounded bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] border-opacity-40 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-[var(--color-text-primary)] leading-none">AgentOps</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Control Tower</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 mx-2 rounded text-[12.5px] transition-colors",
                isActive
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)]",
              )}
            >
              <span className={cn("flex-shrink-0", isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--color-border)]">
        <p className="ao-label">v0.1.0 — MVP</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Evaluation: deterministic</p>
      </div>
    </aside>
  );
}
