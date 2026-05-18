"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tracesApi, ApiError } from "@/lib/api";
import type {
  TraceSummary,
  TraceFilters,
  TraceStatus,
  RunType,
} from "@/types/trace";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatScore,
  formatNumber,
  formatDateTime,
  truncate,
} from "@/lib/utils";

// ─── Local types ──────────────────────────────────────────────────────────────

type HallucinationFilter = "low" | "medium" | "high" | "";

interface ActiveFilters {
  hallucination_risk: HallucinationFilter;
  status: TraceStatus | "";
  run_type: RunType | "";
  search: string;
  page_size: 10 | 20;
}

const DEFAULT_FILTERS: ActiveFilters = {
  hallucination_risk: "",
  status: "",
  run_type: "",
  search: "",
  page_size: 20,
};

// ─── Verdict badge (local helper — mirrors TracesContent) ─────────────────────

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

// ─── Groundedness colour helper ───────────────────────────────────────────────

function groundednessColor(score: number | null | undefined): string {
  if (score == null) return "text-[var(--color-text-muted)]";
  if (score >= 0.75) return "text-[var(--color-success)]";
  if (score >= 0.45) return "text-[var(--color-warning)]";
  return "text-[var(--color-error)]";
}

// ─── KPI summary row ──────────────────────────────────────────────────────────

function KpiSummary({ items }: { items: TraceSummary[] }) {
  const evaluatedCount = items.filter((t) => t.groundedness !== null).length;
  const nonNullScores = items
    .map((t) => t.groundedness)
    .filter((g): g is number => g !== null);
  const avgGroundedness =
    nonNullScores.length > 0
      ? nonNullScores.reduce((a, b) => a + b, 0) / nonNullScores.length
      : null;
  const highRiskCount = items.filter(
    (t) => t.hallucination_risk === "high"
  ).length;
  const unevaluatedCount = items.filter((t) => t.groundedness === null).length;

  const avgVariant =
    avgGroundedness == null
      ? "default"
      : avgGroundedness >= 0.6
        ? "success"
        : avgGroundedness >= 0.4
          ? "warning"
          : "error";

  return (
    <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCard
        label="Evaluated"
        value={formatNumber(evaluatedCount)}
        sub="scored, this page"
        variant="accent"
      />
      <MetricCard
        label="Avg Groundedness"
        value={formatScore(avgGroundedness)}
        sub="mean, this page"
        variant={avgVariant}
      />
      <MetricCard
        label="High Risk"
        value={formatNumber(highRiskCount)}
        sub="on this page"
        variant={highRiskCount > 0 ? "error" : "default"}
      />
      <MetricCard
        label="Unevaluated"
        value={formatNumber(unevaluatedCount)}
        sub="no scores, this page"
        variant={unevaluatedCount > 0 ? "warning" : "default"}
      />
    </div>
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

      {/* Hallucination risk — first because it's the primary eval filter */}
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

// ─── Evaluations table ────────────────────────────────────────────────────────

const TABLE_HEADERS = [
  "Run ID",
  "Created",
  "Query",
  "Model",
  "Status",
  "Run Type",
  "Groundedness",
  "Halluc. Risk",
  "Review",
] as const;

interface EvalTableProps {
  items: TraceSummary[];
  onRowClick: (id: string) => void;
}

function EvalTable({ items, onRowClick }: EvalTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: "900px" }}>
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

              {/* Query */}
              <td className="px-3 py-2.5" style={{ maxWidth: "260px" }}>
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

              {/* Status */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <StatusBadge status={row.status} />
              </td>

              {/* Run type */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="ao-mono text-[11px] text-[var(--color-text-secondary)]">
                  {row.run_type}
                </span>
              </td>

              {/* Groundedness — semantic colour, no bar */}
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span
                  className={`text-[12px] font-medium ${groundednessColor(row.groundedness)}`}
                >
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

export function EvaluationsContent() {
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
        ...(filters.hallucination_risk
          ? { hallucination_risk: filters.hallucination_risk }
          : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.run_type ? { run_type: filters.run_type } : {}),
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

      {/* KPI summary — rendered only once data is available */}
      {!loading && !error && items.length > 0 && (
        <KpiSummary items={items} />
      )}

      {/* Table card */}
      <div className="ao-card mx-4 my-4 overflow-hidden">
        {loading && <LoadingState rows={8} />}

        {!loading && error && (
          <ErrorState message={error} retry={load} className="py-12" />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="No traces found"
            description="Try adjusting your filters. Evaluation scores are computed automatically for all successful trace runs."
            className="py-12"
          />
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <EvalTable
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
