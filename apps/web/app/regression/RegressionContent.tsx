"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { regressionApi, promptsApi, ApiError } from "@/lib/api";
import type {
  RegressionCaseRead,
  PromptVersionRead,
  CompareResult,
  CompareResultItem,
} from "@/types/regression";
import { MetricCard } from "@/components/ui/MetricCard";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNumber, formatDateTime, truncate } from "@/lib/utils";

// ─── Winner badge ─────────────────────────────────────────────────────────────

function WinnerBadge({ winner }: { winner: "a" | "b" | "tie" | null }) {
  if (!winner) {
    return (
      <span className="text-[11px] text-[var(--color-text-muted)]">
        No winner
      </span>
    );
  }
  if (winner === "tie") {
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium text-[var(--color-warning)] bg-[var(--color-warning-dim)]">
        Tie
      </span>
    );
  }
  const label = winner === "a" ? "Prompt A wins" : "Prompt B wins";
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-subtle)]">
      {label}
    </span>
  );
}

// ─── Comparison side card ─────────────────────────────────────────────────────

function ComparisonSideCard({
  result,
  isWinner,
}: {
  result: CompareResultItem;
  isWinner: boolean;
}) {
  return (
    <div
      className="ao-card-raised p-3 space-y-2.5"
      style={isWinner ? { borderColor: "var(--color-accent)" } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="ao-mono text-[11.5px] text-[var(--color-text-primary)] font-medium">
          {result.prompt_version}
        </span>
        {isWinner && (
          <span className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wide">
            winner
          </span>
        )}
      </div>
      <ScoreBar label="Groundedness" value={result.groundedness} />
      <ScoreBar label="Completeness" value={result.answer_completeness} />
      <div className="pt-2 border-t border-[var(--color-border)]">
        <p className="ao-label mb-1">Mock Answer</p>
        <p className="text-[11.5px] text-[var(--color-text-secondary)] italic leading-relaxed">
          {result.mock_answer}
        </p>
      </div>
    </div>
  );
}

// ─── Comparison result block ──────────────────────────────────────────────────

function ComparisonResultBlock({ result }: { result: CompareResult }) {
  return (
    <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
      {/* Winner + method label */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <WinnerBadge winner={result.winner} />
        <span className="ao-mono text-[10px] text-[var(--color-text-muted)]">
          {result.comparison_method}
        </span>
      </div>

      {/* Side-by-side scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ComparisonSideCard
          result={result.result_a}
          isWinner={result.winner === "a"}
        />
        <ComparisonSideCard
          result={result.result_b}
          isWinner={result.winner === "b"}
        />
      </div>

      {/* Notes */}
      {result.notes && (
        <p className="text-[11px] text-[var(--color-text-secondary)]">
          {result.notes}
        </p>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-[var(--color-text-muted)] italic">
        Deterministic mock comparison for local regression testing — not a
        production LLM judge.
      </p>
    </div>
  );
}

// ─── KPI summary row ──────────────────────────────────────────────────────────

interface KpiSummaryProps {
  cases: RegressionCaseRead[];
  pvList: PromptVersionRead[];
}

function KpiSummary({ cases, pvList }: KpiSummaryProps) {
  const compared = cases.filter((c) => c.comparison_result !== null).length;
  const notCompared = cases.filter((c) => c.comparison_result === null).length;
  const activePv = pvList.find((pv) => pv.is_active);

  return (
    <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCard
        label="Total Cases"
        value={formatNumber(cases.length)}
        sub="regression cases"
        variant="default"
      />
      <MetricCard
        label="Compared"
        value={formatNumber(compared)}
        sub="with results"
        variant={compared > 0 ? "success" : "default"}
      />
      <MetricCard
        label="Not Compared"
        value={formatNumber(notCompared)}
        sub="awaiting run"
        variant={notCompared > 0 ? "warning" : "default"}
      />
      <MetricCard
        label="Active Prompt"
        value={activePv?.version_label ?? "None"}
        sub={
          activePv?.description
            ? truncate(activePv.description, 32)
            : "no active version"
        }
        variant={activePv ? "accent" : "default"}
      />
    </div>
  );
}

// ─── Case card ────────────────────────────────────────────────────────────────

interface CaseCardProps {
  item: RegressionCaseRead;
  pvMap: Map<string, PromptVersionRead>;
  isRunning: boolean;
  caseError: string | undefined;
  onRunComparison: (id: string, pvA: string, pvB: string) => void;
}

function CaseCard({
  item,
  pvMap,
  isRunning,
  caseError,
  onRunComparison,
}: CaseCardProps) {
  const pvA = item.prompt_version_a
    ? (pvMap.get(item.prompt_version_a) ?? null)
    : null;
  const pvB = item.prompt_version_b
    ? (pvMap.get(item.prompt_version_b) ?? null)
    : null;

  const labelA =
    pvA?.version_label ??
    (item.prompt_version_a
      ? item.prompt_version_a.slice(0, 8) + "…"
      : "—");
  const labelB =
    pvB?.version_label ??
    (item.prompt_version_b
      ? item.prompt_version_b.slice(0, 8) + "…"
      : "—");

  const canCompare =
    item.prompt_version_a !== null && item.prompt_version_b !== null;

  return (
    <div className="ao-card overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] leading-snug">
            {item.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {formatDateTime(item.created_at)}
            </span>
            {item.source_trace_id && (
              <Link
                href={`/traces/${item.source_trace_id}`}
                className="text-[11px] text-[var(--color-accent)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View source trace →
              </Link>
            )}
          </div>
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-bg-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-4">
        {/* Query & expected behavior — side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="ao-label mb-1.5">User Query</p>
            <p className="text-[12.5px] text-[var(--color-text-primary)] leading-relaxed">
              {item.user_query}
            </p>
          </div>
          <div>
            <p className="ao-label mb-1.5">Expected Behavior</p>
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              {item.expected_behavior}
            </p>
          </div>
        </div>

        {/* Reference context chunks — shown when present */}
        {item.reference_context && item.reference_context.length > 0 && (
          <div>
            <p className="ao-label mb-1.5">Reference Context</p>
            <div className="space-y-1.5">
              {item.reference_context.map((chunk, i) => (
                <div key={i} className="ao-card-raised px-3 py-2">
                  <p className="text-[11px] font-medium text-[var(--color-accent)]">
                    {chunk.source}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                    {truncate(chunk.content, 120)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompt version labels */}
        <div className="flex items-center gap-2 flex-wrap text-[12px]">
          <span className="ao-label">Prompts</span>
          <span className="ao-mono text-[var(--color-text-primary)]">
            {labelA}
          </span>
          <span className="text-[var(--color-text-muted)]">vs</span>
          <span className="ao-mono text-[var(--color-text-primary)]">
            {labelB}
          </span>
        </div>

        {/* Comparison result — or run button if not yet compared */}
        {item.comparison_result ? (
          <ComparisonResultBlock result={item.comparison_result} />
        ) : (
          <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
            {canCompare ? (
              <button
                onClick={() => {
                  if (item.prompt_version_a && item.prompt_version_b) {
                    onRunComparison(
                      item.id,
                      item.prompt_version_a,
                      item.prompt_version_b,
                    );
                  }
                }}
                disabled={isRunning}
                className="px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? "Running…" : "Run Comparison"}
              </button>
            ) : (
              <span className="text-[12px] text-[var(--color-text-muted)] italic">
                Prompt versions unavailable
              </span>
            )}
            {caseError && (
              <p className="text-[11.5px] text-[var(--color-error)]">
                {caseError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RegressionContent() {
  const [cases, setCases] = useState<RegressionCaseRead[]>([]);
  const [pvMap, setPvMap] = useState<Map<string, PromptVersionRead>>(
    new Map(),
  );
  const [pvList, setPvList] = useState<PromptVersionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [caseErrors, setCaseErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [casesData, pvData] = await Promise.all([
        regressionApi.list(),
        promptsApi.list(),
      ]);
      setCases(casesData);
      setPvList(pvData);
      setPvMap(new Map(pvData.map((pv) => [pv.id, pv])));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API error ${err.status}: ${err.message}`);
      } else {
        setError(
          "Could not reach the API. Ensure the backend is running on port 8000.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Per-card comparison handler — updates only the affected case in local state
  function handleRunComparison(
    caseId: string,
    pvA: string,
    pvB: string,
  ): void {
    setRunningIds((prev) => new Set(prev).add(caseId));
    setCaseErrors((prev) => {
      const next = { ...prev };
      delete next[caseId];
      return next;
    });

    regressionApi
      .compare(caseId, { prompt_version_a: pvA, prompt_version_b: pvB })
      .then((result) => {
        setCases((prev) =>
          prev.map((c) =>
            c.id === caseId ? { ...c, comparison_result: result } : c,
          ),
        );
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError
            ? `Comparison failed: ${err.message}`
            : "Comparison failed. Check that the API is running.";
        setCaseErrors((prev) => ({ ...prev, [caseId]: msg }));
      })
      .finally(() => {
        setRunningIds((prev) => {
          const next = new Set(prev);
          next.delete(caseId);
          return next;
        });
      });
  }

  return (
    <div>
      {/* KPI row — shown once data is available */}
      {!loading && !error && cases.length > 0 && (
        <KpiSummary cases={cases} pvList={pvList} />
      )}

      {/* Loading skeleton */}
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

      {/* Empty state */}
      {!loading && !error && cases.length === 0 && (
        <div className="ao-card mx-4 my-4 overflow-hidden">
          <EmptyState
            title="No regression cases found"
            description="Regression cases can be added by promoting reviewed traces or creating them directly via the API."
            className="py-12"
          />
        </div>
      )}

      {/* Case cards */}
      {!loading && !error && cases.length > 0 && (
        <div className="px-4 py-4 space-y-4">
          {cases.map((rc) => (
            <CaseCard
              key={rc.id}
              item={rc}
              pvMap={pvMap}
              isRunning={runningIds.has(rc.id)}
              caseError={caseErrors[rc.id]}
              onRunComparison={handleRunComparison}
            />
          ))}
        </div>
      )}
    </div>
  );
}
