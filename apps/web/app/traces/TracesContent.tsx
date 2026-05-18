"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tracesApi, ApiError } from "@/lib/api";
import type {
  TraceSummary,
  TraceFilters,
  TraceStatus,
  RunType,
  RunEnvironment,
} from "@/types/trace";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatLatency,
  formatCost,
  formatNumber,
  formatScore,
  formatDateTime,
  truncate,
} from "@/lib/utils";

// ─── Local types ──────────────────────────────────────────────────────────────

type HallucinationFilter = "low" | "medium" | "high" | "";

interface ActiveFilters {
  status: TraceStatus | "";
  run_type: RunType | "";
  environment: RunEnvironment | "";
  hallucination_risk: HallucinationFilter;
  search: string;
  page_size: 10 | 20;
}

const DEFAULT_FILTERS: ActiveFilters = {
  status: "",
  run_type: "",
  environment: "",
  hallucination_risk: "",
  search: "",
  page_size: 20,
};

// ─── Verdict badge (inline — no separate component file needed) ───────────────

function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) {
    return <span className="text-[var(--color-text-muted)]">—</span>;
  }
  const config: Record<string, { label: string; cls: string }> = {
    good: {
      label: "good",
      cls: "text-[var(--color-success)] bg-[var(--color-success-dim)]",
    },
    bad: {
      label: "bad",
      cls: "text-[var(--color-error)] bg-[var(--color-error-dim)]",
    },
    needs_improvement: {
      label: "needs work",
      cls: "text-[var(--color-warning)] bg-[var(--color-warning-dim)]",
    },
  };
  const c = config[verdict] ?? config["bad"];
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: ActiveFilters;
  onChange: (update: Partial<ActiveFilters>) => void;
}

function FilterBar({ filters, onChange }: FilterBarProps) {
  const selectCls =
    "h-7 px-2 text-[11.5px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded " +
    "text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer";
  const inputCls =
    "h-7 px-2 text-[11.5px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded w-52 " +
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] " +
    "focus:outline-none focus:border-[var(--color-accent)] transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      {/* Search */}
      <input
        type="text"
        placeholder="Search query…"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className={inputCls}
      />

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) =>
          onChange({ status: e.target.value as TraceStatus | "" })
        }
        className={selectCls}
      >
        <option value="">All statuses</option>
        <option value="success">success</option>
        <option value="error">error</option>
        <option value="timeout">timeout</option>
      </select>

      {/* Run type */}
      <select
        value={filters.run_type}
        onChange={(e) =>
          onChange({ run_type: e.target.value as RunType | "" })
        }
        className={selectCls}
      >
        <option value="">All run types</option>
        <option value="rag">rag</option>
        <option value="agent">agent</option>
        <option value="chat">chat</option>
        <option value="regression">regression</option>
        <option value="evaluation">evaluation</option>
      </select>

      {/* Environment */}
      <select
        value={filters.environment}
        onChange={(e) =>
          onChange({ environment: e.target.value as RunEnvironment | "" })
        }
        className={selectCls}
      >
        <option value="">All environments</option>
        <option value="development">development</option>
        <option value="staging">staging</option>
        <option value="production">production</option>
      </select>

      {/* Hallucination risk */}
      <select
        value={filters.hallucination_risk}
        onChange={(e) =>
          onChange({ hallucination_risk: e.target.value as HallucinationFilter })
        }
        className={selectCls}
      >
        <option value="">All risk levels</option>
        <option value="low">low risk</option>
        <option value="medium">medium risk</option>
        <option value="high">high risk</option>
      </select>

      {/* Page size — pushed to the right */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="ao-label">Rows</span>
        <select
          value={filters.page_size}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v === 10 || v === 20) onChange({ page_size: v });
          }}
          className={selectCls}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </div>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

function formatVersionId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

const TABLE_HEADERS = [
  "Run ID",
  "Created",
  "Type",
  "Environment",
  "Query",
  "Model / Provider",
  "Prompt Ver.",
  "Status",
  "Latency",
  "Tokens",
  "Cost",
  "Groundedness",
  "Halluc. Risk",
  "Review",
] as const;

interface TraceTableProps {
  items: TraceSummary[];
  onRowClick: (id: string) => void;
}

function TraceTable({ items, onRowClick }: TraceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: "1240px" }}>
        <thead>
          <tr>
            {TABLE_HEADERS.map((h) => (
              <th
                key={h}
                className="ao-label px-3 py-2.5 text-left whitespace-nowrap bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.id)}
              className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-raised)] cursor-pointer transition-colors"
            >
              {/* Run ID */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="ao-mono text-[11px] text-[var(--color-text-secondary)]">
                  {truncate(row.run_id, 18)}
                </span>
              </td>

              {/* Created */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {formatDateTime(row.created_at)}
                </span>
              </td>

              {/* Type */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="ao-mono text-[11px] text-[var(--color-text-secondary)]">
                  {row.run_type}
                </span>
              </td>

              {/* Environment */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {row.environment}
                </span>
              </td>

              {/* Query preview */}
              <td className="px-3 py-2.5" style={{ maxWidth: "280px" }}>
                <span className="text-[12px] text-[var(--color-text-primary)] block truncate">
                  {row.user_query}
                </span>
              </td>

              {/* Model / Provider */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="text-[12px] text-[var(--color-text-primary)] block">
                  {row.model}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                  {row.provider}
                </span>
              </td>

              {/* Prompt version */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="ao-mono text-[11px] text-[var(--color-text-muted)]">
                  {formatVersionId(row.prompt_version_id)}
                </span>
              </td>

              {/* Status */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <StatusBadge status={row.status} />
              </td>

              {/* Latency */}
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  {formatLatency(row.latency_ms)}
                </span>
              </td>

              {/* Total tokens */}
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  {formatNumber(row.total_tokens)}
                </span>
              </td>

              {/* Cost */}
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  {formatCost(row.estimated_cost_usd)}
                </span>
              </td>

              {/* Groundedness */}
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span className="text-[12px] text-[var(--color-text-primary)]">
                  {formatScore(row.groundedness)}
                </span>
              </td>

              {/* Hallucination risk */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <RiskBadge risk={row.hallucination_risk} />
              </td>

              {/* Review verdict */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <VerdictBadge verdict={row.review_verdict} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({ page, pageSize, total, onPrev, onNext }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);
  const btnCls =
    "px-2.5 py-1 text-[11.5px] font-medium text-[var(--color-text-primary)] " +
    "bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded " +
    "hover:border-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
      <span className="text-[11.5px] text-[var(--color-text-muted)]">
        {total > 0
          ? `Showing ${from}–${to} of ${formatNumber(total)} traces`
          : "No traces"}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          <button onClick={onPrev} disabled={page <= 1} className={btnCls}>
            ← Prev
          </button>
          <button
            onClick={onNext}
            disabled={page >= totalPages}
            className={btnCls}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TracesContent() {
  const router = useRouter();
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TraceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters: TraceFilters = {
        page,
        page_size: filters.page_size,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.run_type ? { run_type: filters.run_type } : {}),
        ...(filters.environment ? { environment: filters.environment } : {}),
        ...(filters.hallucination_risk
          ? { hallucination_risk: filters.hallucination_risk }
          : {}),
        ...(filters.search ? { search: filters.search } : {}),
      };
      const result = await tracesApi.list(apiFilters);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API error ${err.status}: ${err.message}`);
      } else {
        setError(
          "Could not reach the API. Ensure the backend is running on port 8000."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilterChange(update: Partial<ActiveFilters>) {
    setFilters((prev) => ({ ...prev, ...update }));
    setPage(1);
  }

  return (
    <div>
      <FilterBar filters={filters} onChange={handleFilterChange} />

      <div className="ao-card mx-4 my-4 overflow-hidden">
        {loading && <LoadingState rows={8} />}

        {!loading && error && (
          <ErrorState message={error} retry={load} className="py-12" />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="No traces found"
            description="Try adjusting your filters, or ingest traces using the demo RAG app."
            className="py-12"
          />
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <TraceTable
              items={items}
              onRowClick={(id) => router.push(`/traces/${id}`)}
            />
            <Pagination
              page={page}
              pageSize={filters.page_size}
              total={total}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </div>
    </div>
  );
}
