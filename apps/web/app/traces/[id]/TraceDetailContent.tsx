"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { tracesApi, ApiError } from "@/lib/api";
import type { TraceRead, RetrievedChunk } from "@/types/trace";
import type { EvaluationRead } from "@/types/evaluation";
import type { ReviewRead } from "@/types/review";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { JsonBlock } from "@/components/ui/JsonBlock";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  formatLatency,
  formatCost,
  formatNumber,
  formatDateTime,
} from "@/lib/utils";

// ─── Shared primitives ────────────────────────────────────────────────────────

/** One labelled row in a metadata card. */
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  const content =
    value === null || value === undefined ? (
      <span className="text-[var(--color-text-muted)]">—</span>
    ) : (
      value
    );
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-[11px] text-[var(--color-text-muted)] flex-shrink-0 mt-px">
        {label}
      </span>
      <div className="text-[12px] text-[var(--color-text-primary)] text-right break-all">
        {content}
      </div>
    </div>
  );
}

/** Standard section card wrapper. */
function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="ao-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
        <p className="ao-label">{title}</p>
        {badge && <div>{badge}</div>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

/** Muted "not available" placeholder for optional text fields. */
function NA() {
  return (
    <p className="text-[12px] text-[var(--color-text-muted)] italic">
      Not available
    </p>
  );
}

/** Back-arrow SVG used in the sticky header. */
function BackArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2L4 6l4 4" />
    </svg>
  );
}

// ─── Sticky detail header ─────────────────────────────────────────────────────

function DetailHeader({ trace }: { trace: TraceRead | null }) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {/* Back link */}
        <Link
          href="/traces"
          className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0"
        >
          <BackArrowIcon />
          Traces
        </Link>

        {/* Populated once trace is loaded */}
        {trace && (
          <>
            <span className="text-[var(--color-border)] select-none">/</span>
            <span className="ao-mono text-[12px] text-[var(--color-text-secondary)] truncate max-w-[200px] lg:max-w-[360px]">
              {trace.run_id}
            </span>
            <StatusBadge status={trace.status} />
            {trace.evaluation?.hallucination_risk && (
              <RiskBadge risk={trace.evaluation.hallucination_risk} />
            )}
          </>
        )}
      </div>

      {trace && (
        <span className="text-[11px] text-[var(--color-text-muted)] flex-shrink-0 ml-4">
          {formatDateTime(trace.created_at)}
        </span>
      )}
    </div>
  );
}

// ─── Left-column cards ────────────────────────────────────────────────────────

function QueryCard({ trace }: { trace: TraceRead }) {
  return (
    <SectionCard title="User Query">
      <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap break-words">
        {trace.user_query}
      </p>
    </SectionCard>
  );
}

function SystemPromptCard({ trace }: { trace: TraceRead }) {
  return (
    <SectionCard title="System Prompt">
      {trace.system_prompt ? (
        <pre className="ao-mono text-[11.5px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap break-words">
          {trace.system_prompt}
        </pre>
      ) : (
        <NA />
      )}
    </SectionCard>
  );
}

function ChunkItem({ chunk, index }: { chunk: RetrievedChunk; index: number }) {
  return (
    <div className="ao-card-raised p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium text-[var(--color-accent)] break-all leading-snug">
          {chunk.source}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0">
          {chunk.chunk_index != null && (
            <span className="ao-mono text-[10px] text-[var(--color-text-muted)]">
              #{chunk.chunk_index}
            </span>
          )}
          {chunk.score != null && (
            <span className="ao-mono text-[10px] text-[var(--color-text-muted)]">
              score {chunk.score.toFixed(3)}
            </span>
          )}
          {chunk.chunk_index == null && chunk.score == null && (
            <span className="ao-mono text-[10px] text-[var(--color-text-muted)]">
              chunk {index + 1}
            </span>
          )}
        </div>
      </div>
      <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
        {chunk.content}
      </p>
    </div>
  );
}

function RetrievedChunksCard({ trace }: { trace: TraceRead }) {
  const chunks = trace.retrieved_chunks;
  const count = chunks?.length ?? 0;

  return (
    <SectionCard
      title="Retrieved Chunks"
      badge={
        count > 0 ? (
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {count} chunk{count !== 1 ? "s" : ""}
          </span>
        ) : undefined
      }
    >
      {!chunks || chunks.length === 0 ? (
        <NA />
      ) : (
        <div className="space-y-2">
          {chunks.map((chunk, i) => (
            <ChunkItem key={i} chunk={chunk} index={i} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function FinalAnswerCard({ trace }: { trace: TraceRead }) {
  return (
    <SectionCard title="Final Answer">
      {trace.final_answer ? (
        <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap break-words">
          {trace.final_answer}
        </p>
      ) : (
        <NA />
      )}
    </SectionCard>
  );
}

function ErrorMessageCard({ trace }: { trace: TraceRead }) {
  if (!trace.error_message) return null;
  return (
    <div className="ao-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-error-dim)]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="text-[var(--color-error)] flex-shrink-0"
        >
          <path
            d="M6 1L11.5 10.5H0.5L6 1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M6 5v2.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="6" cy="9" r="0.5" fill="currentColor" />
        </svg>
        <p className="ao-label text-[var(--color-error)]">Error</p>
      </div>
      <div className="px-4 py-3">
        <pre className="ao-mono text-[11.5px] text-[var(--color-error)] leading-relaxed whitespace-pre-wrap break-words">
          {trace.error_message}
        </pre>
      </div>
    </div>
  );
}

// ─── Right-column cards ───────────────────────────────────────────────────────

function RunInfoCard({ trace }: { trace: TraceRead }) {
  return (
    <SectionCard title="Run Info">
      <InfoRow
        label="Run ID"
        value={
          <span className="ao-mono text-[11px]">{trace.run_id}</span>
        }
      />
      <InfoRow label="Run Type" value={trace.run_type} />
      <InfoRow label="Environment" value={trace.environment} />
      <InfoRow label="Model" value={trace.model} />
      <InfoRow label="Provider" value={trace.provider} />
      <InfoRow
        label="Prompt Version"
        value={
          trace.prompt_version_id ? (
            <span className="ao-mono text-[11px]">
              {trace.prompt_version_id.slice(0, 12)}…
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">Not linked</span>
          )
        }
      />
      {trace.tags && trace.tags.length > 0 && (
        <InfoRow
          label="Tags"
          value={
            <div className="flex flex-wrap gap-1 justify-end">
              {trace.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          }
        />
      )}
    </SectionCard>
  );
}

function PerformanceCard({ trace }: { trace: TraceRead }) {
  return (
    <SectionCard title="Performance">
      <InfoRow label="Latency" value={formatLatency(trace.latency_ms)} />
      <InfoRow
        label="Prompt tokens"
        value={formatNumber(trace.prompt_tokens)}
      />
      <InfoRow
        label="Completion tokens"
        value={formatNumber(trace.completion_tokens)}
      />
      <InfoRow
        label="Total tokens"
        value={formatNumber(trace.total_tokens)}
      />
      <InfoRow
        label="Est. cost"
        value={formatCost(trace.estimated_cost_usd)}
      />
    </SectionCard>
  );
}

function EvaluationCard({ evaluation }: { evaluation: EvaluationRead | null }) {
  if (!evaluation) {
    return (
      <SectionCard title="Evaluation">
        <p className="text-[12px] text-[var(--color-text-muted)]">
          No evaluation available for this trace.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Evaluation"
      badge={
        <span className="ao-mono text-[10px] text-[var(--color-text-muted)]">
          {evaluation.evaluator}
        </span>
      }
    >
      <div className="space-y-2.5">
        <ScoreBar label="Groundedness" value={evaluation.groundedness} />
        <ScoreBar
          label="Context Relevance"
          value={evaluation.context_relevance}
        />
        <ScoreBar
          label="Answer Completeness"
          value={evaluation.answer_completeness}
        />
        <ScoreBar
          label="Citation Support"
          value={evaluation.citation_support}
        />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Hallucination Risk
        </span>
        <RiskBadge risk={evaluation.hallucination_risk} />
      </div>

      {evaluation.notes && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          <p className="ao-label mb-1">Notes</p>
          <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            {evaluation.notes}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

const VERDICT_CONFIG: Record<string, { label: string; color: string }> = {
  good: { label: "Good", color: "text-[var(--color-success)]" },
  bad: { label: "Bad", color: "text-[var(--color-error)]" },
  needs_improvement: {
    label: "Needs Improvement",
    color: "text-[var(--color-warning)]",
  },
};

function ReviewCard({ review }: { review: ReviewRead | null }) {
  if (!review) {
    return (
      <SectionCard title="Human Review">
        <p className="text-[12px] text-[var(--color-text-muted)]">
          This trace has not been reviewed yet.
        </p>
      </SectionCard>
    );
  }

  const verdictCfg = VERDICT_CONFIG[review.verdict];

  return (
    <SectionCard title="Human Review">
      <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)]">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Verdict
        </span>
        <span
          className={`text-[12px] font-semibold ${verdictCfg?.color ?? "text-[var(--color-text-primary)]"}`}
        >
          {verdictCfg?.label ?? review.verdict}
        </span>
      </div>

      {review.reviewer_notes && (
        <div className="py-2 border-b border-[var(--color-border)]">
          <p className="ao-label mb-1">Notes</p>
          <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            {review.reviewer_notes}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)]">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Promoted to regression
        </span>
        <span
          className={`text-[12px] font-medium ${
            review.promoted_to_regression
              ? "text-[var(--color-success)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          {review.promoted_to_regression ? "Yes" : "No"}
        </span>
      </div>

      <div className="flex items-center justify-between py-1.5">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Reviewed
        </span>
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {formatDateTime(review.created_at)}
        </span>
      </div>
    </SectionCard>
  );
}

// ─── Full detail body (rendered only after data is loaded) ────────────────────

function TraceBody({ trace }: { trace: TraceRead }) {
  const hasToolCalls = trace.tool_calls && trace.tool_calls.length > 0;
  const hasMetadata =
    trace.trace_metadata &&
    Object.keys(trace.trace_metadata).length > 0;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left: primary content ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <QueryCard trace={trace} />
          <SystemPromptCard trace={trace} />
          <RetrievedChunksCard trace={trace} />
          <FinalAnswerCard trace={trace} />
          {trace.error_message && <ErrorMessageCard trace={trace} />}
          {hasToolCalls && (
            <JsonBlock
              data={trace.tool_calls}
              title="Tool Calls"
              collapsible
            />
          )}
          {hasMetadata && (
            <JsonBlock
              data={trace.trace_metadata}
              title="Trace Metadata"
              collapsible
            />
          )}
        </div>

        {/* ── Right: metadata sidebar ────────────────────────────────── */}
        <div className="space-y-4">
          <RunInfoCard trace={trace} />
          <PerformanceCard trace={trace} />
          <EvaluationCard evaluation={trace.evaluation} />
          <ReviewCard review={trace.review} />
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TraceDetailContent({ id }: { id: string }) {
  const [trace, setTrace] = useState<TraceRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tracesApi.get(id);
      setTrace(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 404
            ? `Trace not found: ${id}`
            : `API error ${err.status}: ${err.message}`
        );
      } else {
        setError(
          "Could not reach the API. Ensure the backend is running on port 8000."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {/* Sticky breadcrumb header — always visible */}
      <DetailHeader trace={trace} />

      {/* Page body */}
      {loading && <LoadingSpinner className="py-20" />}

      {!loading && error && (
        <ErrorState message={error} retry={load} className="py-20" />
      )}

      {!loading && !error && trace && <TraceBody trace={trace} />}
    </div>
  );
}
