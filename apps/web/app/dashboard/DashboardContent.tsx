"use client";

import { useEffect, useState, useCallback } from "react";
import { metricsApi, ApiError } from "@/lib/api";
import type { DashboardMetrics, RecentFailure } from "@/types/metrics";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatCost,
  formatLatency,
  formatNumber,
  formatScore,
  formatDateTime,
  truncate,
} from "@/lib/utils";

// ─── Run status mini-bar chart ────────────────────────────────────────────────
function StatusBar({ success, error, timeout }: { success: number; error: number; timeout: number }) {
  const total = success + error + timeout;
  if (total === 0) return null;
  const sp = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="mt-3">
      <p className="ao-label mb-2">Run distribution</p>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {success > 0 && (
          <div className="bg-[var(--color-success)] rounded-l" style={{ width: sp(success) }} title={`Success: ${success}`} />
        )}
        {error > 0 && (
          <div className="bg-[var(--color-error)]" style={{ width: sp(error) }} title={`Error: ${error}`} />
        )}
        {timeout > 0 && (
          <div className="bg-[var(--color-warning)] rounded-r" style={{ width: sp(timeout) }} title={`Timeout: ${timeout}`} />
        )}
      </div>
      <div className="flex items-center gap-4 mt-2">
        {[
          { label: "success", color: "bg-[var(--color-success)]", n: success },
          { label: "error",   color: "bg-[var(--color-error)]",   n: error   },
          { label: "timeout", color: "bg-[var(--color-warning)]", n: timeout },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-[11px] text-[var(--color-text-muted)]">{s.label}</span>
            <span className="text-[11px] font-medium text-[var(--color-text-primary)] tabular-nums">{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hallucination risk breakdown ─────────────────────────────────────────────
function HallucinationPanel({ low, medium, high }: { low: number; medium: number; high: number }) {
  const total = low + medium + high;
  return (
    <div className="ao-card px-4 py-4">
      <p className="ao-label mb-3">Hallucination Risk</p>
      <div className="space-y-2">
        {[
          { label: "High",   n: high,   color: "bg-[var(--color-error)]",   text: "text-[var(--color-error)]" },
          { label: "Medium", n: medium, color: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]" },
          { label: "Low",    n: low,    color: "bg-[var(--color-success)]", text: "text-[var(--color-success)]" },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <div className="w-[56px] text-right">
              <span className={`text-[11px] font-medium ${r.text}`}>{r.label}</span>
            </div>
            <div className="flex-1 h-1.5 bg-[var(--color-bg-overlay)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${r.color}`}
                style={{ width: total > 0 ? `${(r.n / total) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-[var(--color-text-secondary)] w-5 text-right">{r.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent failures table ────────────────────────────────────────────────────
function RecentFailuresTable({ failures }: { failures: RecentFailure[] }) {
  if (failures.length === 0) {
    return (
      <EmptyState
        title="No recent failures"
        description="All recent runs completed successfully."
        className="py-8"
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {/* Header */}
      <div className="grid grid-cols-[180px_1fr_80px_90px] gap-4 px-4 py-2">
        <span className="ao-label">Run ID</span>
        <span className="ao-label">Query</span>
        <span className="ao-label">Status</span>
        <span className="ao-label">Latency</span>
      </div>
      {failures.map((f) => (
        <div
          key={f.run_id}
          className="grid grid-cols-[180px_1fr_80px_90px] gap-4 px-4 py-3 hover:bg-[var(--color-bg-raised)] transition-colors"
        >
          <span className="ao-mono text-[var(--color-text-secondary)] truncate">{f.run_id}</span>
          <div>
            <p className="text-[12px] text-[var(--color-text-primary)] truncate">{truncate(f.user_query, 72)}</p>
            {f.error_message && (
              <p className="text-[11px] text-[var(--color-error)] truncate mt-0.5">{truncate(f.error_message, 80)}</p>
            )}
          </div>
          <StatusBadge status={f.status as "error" | "timeout" | "success"} />
          <span className="text-[12px] tabular-nums text-[var(--color-text-secondary)]">
            {formatLatency(f.latency_ms)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main dashboard content ───────────────────────────────────────────────────
export function DashboardContent() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const metrics = await metricsApi.getDashboard();
      setData(metrics);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API error ${err.status}: ${err.message}`);
      } else {
        setError("Could not reach the API. Ensure the backend is running on port 8000.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <ErrorState message={error ?? undefined} retry={load} />
      </div>
    );
  }

  const errorRate = data.total_runs > 0
    ? `${((data.failed_runs / data.total_runs) * 100).toFixed(1)}% error rate`
    : undefined;

  return (
    <div className="p-6 space-y-6">

      {/* ── KPI row 1: Runs ──────────────────────────────────────────────────── */}
      <section>
        <p className="ao-label mb-3">Run Counts</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Total Runs"
            value={formatNumber(data.total_runs)}
            variant="default"
          />
          <MetricCard
            label="Successful"
            value={formatNumber(data.successful_runs)}
            sub={data.total_runs > 0 ? `${Math.round((data.successful_runs / data.total_runs) * 100)}% success rate` : undefined}
            variant="success"
          />
          <MetricCard
            label="Failed"
            value={formatNumber(data.failed_runs)}
            sub={errorRate}
            variant="error"
          />
          <MetricCard
            label="Timed Out"
            value={formatNumber(data.timeout_runs)}
            variant="warning"
          />
        </div>
      </section>

      {/* ── KPI row 2: Performance ───────────────────────────────────────────── */}
      <section>
        <p className="ao-label mb-3">Performance & Cost</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Avg Latency"
            value={formatLatency(data.avg_latency_ms)}
            variant="default"
          />
          <MetricCard
            label="P95 Latency"
            value={formatLatency(data.p95_latency_ms)}
            sub="95th percentile"
            variant="default"
          />
          <MetricCard
            label="Total Cost"
            value={formatCost(data.total_estimated_cost_usd)}
            sub="estimated USD"
            variant="accent"
          />
          <MetricCard
            label="Total Tokens"
            value={formatNumber(data.total_tokens)}
            variant="default"
          />
        </div>
      </section>

      {/* ── KPI row 3: Evaluation ────────────────────────────────────────────── */}
      <section>
        <p className="ao-label mb-3">Evaluation Quality</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Avg Groundedness"
            value={formatScore(data.avg_groundedness)}
            sub="deterministic-v1 evaluator"
            variant={data.avg_groundedness != null && data.avg_groundedness >= 0.6 ? "success" : "warning"}
          />
          <MetricCard
            label="High Hallucination Risk"
            value={formatNumber(data.hallucination_counts.high)}
            sub="runs flagged as high risk"
            variant={data.hallucination_counts.high > 0 ? "error" : "default"}
          />
          <MetricCard
            label="Evaluated Runs"
            value={formatNumber(
              data.hallucination_counts.low +
              data.hallucination_counts.medium +
              data.hallucination_counts.high,
            )}
            sub="with evaluation scores"
            variant="default"
          />
        </div>
      </section>

      {/* ── Bottom row: Distribution + Hallucination + Recent Failures ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Run status distribution */}
        <div className="ao-card px-4 py-4">
          <p className="ao-label mb-0">Run Status</p>
          <StatusBar
            success={data.runs_by_status.success}
            error={data.runs_by_status.error}
            timeout={data.runs_by_status.timeout}
          />
        </div>

        {/* Hallucination risk breakdown */}
        <HallucinationPanel
          low={data.hallucination_counts.low}
          medium={data.hallucination_counts.medium}
          high={data.hallucination_counts.high}
        />

        {/* Recent failures */}
        <div className="ao-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="ao-label">Recent Failures</p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {data.recent_failures.length === 0 ? (
              <p className="text-[12px] text-[var(--color-text-muted)] px-4 py-4">No recent failures.</p>
            ) : (
              data.recent_failures.map((f) => (
                <div key={f.run_id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="ao-mono text-[var(--color-text-muted)] text-[11px]">{f.run_id}</span>
                    <StatusBadge status={f.status as "error" | "timeout" | "success"} />
                  </div>
                  <p className="text-[12px] text-[var(--color-text-primary)] mt-1 line-clamp-1">
                    {truncate(f.user_query, 60)}
                  </p>
                  {f.error_message && (
                    <p className="text-[11px] text-[var(--color-error)] mt-0.5 line-clamp-1">
                      {truncate(f.error_message, 60)}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{formatDateTime(f.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Full recent failures table ────────────────────────────────────────── */}
      {data.recent_failures.length > 0 && (
        <section>
          <div className="ao-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <p className="ao-label">Recent Failed Runs</p>
              <span className="text-[11px] text-[var(--color-text-muted)]">Last {data.recent_failures.length}</span>
            </div>
            <RecentFailuresTable failures={data.recent_failures} />
          </div>
        </section>
      )}

      {/* ── Evaluator notice ─────────────────────────────────────────────────── */}
      <div className="rounded border border-[var(--color-border)] border-dashed px-4 py-3 flex items-start gap-3">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-text-muted)] mt-0.5 flex-shrink-0">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <p className="text-[11.5px] text-[var(--color-text-muted)]">
          Evaluation scores are produced by the <code className="ao-mono text-[var(--color-text-secondary)] px-1">deterministic-v1</code> heuristic evaluator — keyword overlap and length heuristics. They are MVP placeholders, not production-grade quality scores. See <code className="ao-mono text-[var(--color-text-secondary)] px-1">docs/evaluation-methodology.md</code> for details.
        </p>
      </div>

    </div>
  );
}
