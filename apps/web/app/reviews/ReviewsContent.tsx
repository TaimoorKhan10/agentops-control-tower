"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { reviewsApi, ApiError } from "@/lib/api";
import type { ReviewRead, PendingReviewItem, ReviewVerdict } from "@/types/review";
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

type VerdictFilter = ReviewVerdict | "";

// ─── Verdict badge ────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: ReviewVerdict | string | null | undefined }) {
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

// ─── Promoted badge ───────────────────────────────────────────────────────────

function PromotedBadge({ promoted }: { promoted: boolean }) {
  if (promoted) {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-subtle)]">
        yes
      </span>
    );
  }
  return <span className="text-[11px] text-[var(--color-text-muted)]">no</span>;
}

// ─── KPI summary row ──────────────────────────────────────────────────────────

interface KpiSummaryProps {
  pending: PendingReviewItem[];
  allReviews: ReviewRead[];
}

function KpiSummary({ pending, allReviews }: KpiSummaryProps) {
  const good = allReviews.filter((r) => r.verdict === "good").length;
  const bad = allReviews.filter((r) => r.verdict === "bad").length;
  const needsImprovement = allReviews.filter(
    (r) => r.verdict === "needs_improvement"
  ).length;

  return (
    <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCard
        label="Pending"
        value={formatNumber(pending.length)}
        sub="awaiting review"
        variant={pending.length > 0 ? "warning" : "default"}
      />
      <MetricCard
        label="Good"
        value={formatNumber(good)}
        sub="approved"
        variant={good > 0 ? "success" : "default"}
      />
      <MetricCard
        label="Bad"
        value={formatNumber(bad)}
        sub="flagged"
        variant={bad > 0 ? "error" : "default"}
      />
      <MetricCard
        label="Needs Work"
        value={formatNumber(needsImprovement)}
        sub="needs improvement"
        variant={needsImprovement > 0 ? "warning" : "default"}
      />
    </div>
  );
}

// ─── Pending queue table ──────────────────────────────────────────────────────

const PENDING_HEADERS = [
  "Run ID",
  "Created",
  "Query",
  "Status",
  "Halluc. Risk",
  "Groundedness",
] as const;

interface PendingTableProps {
  items: PendingReviewItem[];
  onRowClick: (id: string) => void;
}

function PendingTable({ items, onRowClick }: PendingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: "700px" }}>
        <thead>
          <tr>
            {PENDING_HEADERS.map((h) => (
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
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick(item.id)}
              className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-raised)] cursor-pointer transition-colors"
            >
              {/* Run ID */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="ao-mono text-[11px] text-[var(--color-text-secondary)]">
                  {truncate(item.run_id, 18)}
                </span>
              </td>

              {/* Created */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {formatDateTime(item.created_at)}
                </span>
              </td>

              {/* Query */}
              <td className="px-3 py-2.5" style={{ maxWidth: "300px" }}>
                <span className="text-[12px] text-[var(--color-text-primary)] block truncate">
                  {item.user_query}
                </span>
              </td>

              {/* Status */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <StatusBadge status={item.status} />
              </td>

              {/* Hallucination risk */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <RiskBadge risk={item.hallucination_risk} />
              </td>

              {/* Groundedness */}
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span
                  className={`text-[12px] font-medium ${groundednessColor(item.groundedness)}`}
                >
                  {formatScore(item.groundedness)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Completed reviews table ──────────────────────────────────────────────────

const REVIEW_HEADERS = [
  "Trace ID",
  "Verdict",
  "Notes",
  "Promoted",
  "Reviewed At",
] as const;

interface ReviewsTableProps {
  items: ReviewRead[];
  onRowClick: (traceId: string) => void;
}

function ReviewsTable({ items, onRowClick }: ReviewsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: "650px" }}>
        <thead>
          <tr>
            {REVIEW_HEADERS.map((h) => (
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
          {items.map((review) => (
            <tr
              key={review.id}
              onClick={() => onRowClick(review.trace_id)}
              className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-raised)] cursor-pointer transition-colors"
            >
              {/* Trace ID */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="ao-mono text-[11px] text-[var(--color-text-secondary)]">
                  {review.trace_id.slice(0, 8)}…
                </span>
              </td>

              {/* Verdict */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <VerdictBadge verdict={review.verdict} />
              </td>

              {/* Notes */}
              <td className="px-3 py-2.5" style={{ maxWidth: "280px" }}>
                {review.reviewer_notes ? (
                  <span className="text-[12px] text-[var(--color-text-secondary)] block truncate">
                    {truncate(review.reviewer_notes, 60)}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--color-text-muted)]">—</span>
                )}
              </td>

              {/* Promoted to regression */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <PromotedBadge promoted={review.promoted_to_regression} />
              </td>

              {/* Reviewed at */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {formatDateTime(review.updated_at)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewsContent() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingReviewItem[]>([]);
  const [allReviews, setAllReviews] = useState<ReviewRead[]>([]);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingData, reviewsData] = await Promise.all([
        reviewsApi.pending(),
        reviewsApi.list(),
      ]);
      setPending(pendingData);
      setAllReviews(reviewsData);
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side verdict filtering — volume is small, no refetch needed
  const displayedReviews: ReviewRead[] = verdictFilter
    ? allReviews.filter((r) => r.verdict === verdictFilter)
    : allReviews;

  const selectCls =
    "h-7 px-2 text-[11.5px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded " +
    "text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer";

  return (
    <div>
      {/* KPI row — shown once data is available */}
      {!loading && !error && (pending.length > 0 || allReviews.length > 0) && (
        <KpiSummary pending={pending} allReviews={allReviews} />
      )}

      {/* Single loading skeleton during initial fetch */}
      {loading && (
        <div className="ao-card mx-4 my-4 overflow-hidden">
          <LoadingState rows={6} />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="ao-card mx-4 my-4 overflow-hidden">
          <ErrorState message={error} retry={load} className="py-12" />
        </div>
      )}

      {/* Page content — both sections */}
      {!loading && !error && (
        <div className="px-4 py-4 space-y-5">
          {/* ── Section 1: Pending Queue ────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="ao-label">Pending Queue</p>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-bg-overlay)] text-[var(--color-text-muted)]">
                {pending.length}
              </span>
            </div>

            <div className="ao-card overflow-hidden">
              {pending.length === 0 ? (
                <EmptyState
                  title="No pending reviews"
                  description="All traces have been reviewed."
                  className="py-10"
                />
              ) : (
                <PendingTable
                  items={pending}
                  onRowClick={(id) => router.push(`/traces/${id}`)}
                />
              )}
            </div>
          </div>

          {/* ── Section 2: Completed Reviews ────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="ao-label">Completed Reviews</p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-bg-overlay)] text-[var(--color-text-muted)]">
                  {allReviews.length}
                </span>
              </div>

              {/* Verdict filter */}
              <select
                value={verdictFilter}
                onChange={(e) =>
                  setVerdictFilter(e.target.value as VerdictFilter)
                }
                className={selectCls}
              >
                <option value="">All verdicts</option>
                <option value="good">good</option>
                <option value="bad">bad</option>
                <option value="needs_improvement">needs improvement</option>
              </select>
            </div>

            <div className="ao-card overflow-hidden">
              {displayedReviews.length === 0 ? (
                <EmptyState
                  title="No reviews match filter"
                  description="Try a different verdict filter or clear the selection."
                  className="py-10"
                />
              ) : (
                <>
                  <ReviewsTable
                    items={displayedReviews}
                    onRowClick={(traceId) => router.push(`/traces/${traceId}`)}
                  />
                  <div className="px-4 py-2.5 border-t border-[var(--color-border)]">
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Completed reviews include review metadata only. Open the
                      trace to view query, model, evaluation, and full context.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
