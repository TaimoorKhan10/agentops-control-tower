/**
 * Typed API client for the AgentOps Control Tower backend.
 * All requests go through this module — no fetch() calls in components.
 *
 * Base URL is read from NEXT_PUBLIC_API_URL environment variable.
 * Falls back to http://localhost:8000 for local development.
 */
import type { DashboardMetrics } from "@/types/metrics";
import type { TraceRead, TraceListResponse, TraceFilters } from "@/types/trace";
import type { EvaluationRead } from "@/types/evaluation";
import type { ReviewRead, PendingReviewItem } from "@/types/review";
import type { RegressionCaseRead } from "@/types/regression";
import type { PromptVersionRead } from "@/types/regression";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}/api/v1${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
export const metricsApi = {
  getDashboard: (): Promise<DashboardMetrics> =>
    apiFetch<DashboardMetrics>("/metrics/dashboard"),
};

// ---------------------------------------------------------------------------
// Traces
// ---------------------------------------------------------------------------
export const tracesApi = {
  list: (filters: TraceFilters = {}): Promise<TraceListResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch<TraceListResponse>(`/traces${qs ? `?${qs}` : ""}`);
  },
  get: (id: string): Promise<TraceRead> =>
    apiFetch<TraceRead>(`/traces/${id}`),
};

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------
export const evaluationsApi = {
  list: (params?: { hallucination_risk?: string; page?: number }): Promise<EvaluationRead[]> => {
    const qs = params
      ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
      : "";
    return apiFetch<EvaluationRead[]>(`/evaluations${qs}`);
  },
  getByTrace: (traceId: string): Promise<EvaluationRead> =>
    apiFetch<EvaluationRead>(`/evaluations/${traceId}`),
  run: (traceId: string): Promise<{ trace_id: string; evaluation: EvaluationRead }> =>
    apiFetch(`/evaluations/${traceId}/run`, { method: "POST" }),
};

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const reviewsApi = {
  list: (verdict?: string): Promise<ReviewRead[]> =>
    apiFetch<ReviewRead[]>(`/reviews${verdict ? `?verdict=${verdict}` : ""}`),
  pending: (): Promise<PendingReviewItem[]> =>
    apiFetch<PendingReviewItem[]>("/reviews/pending"),
  submit: (traceId: string, body: { verdict: string; reviewer_notes?: string }): Promise<ReviewRead> =>
    apiFetch<ReviewRead>(`/reviews/${traceId}`, { method: "POST", body: JSON.stringify(body) }),
  update: (traceId: string, body: Partial<{ verdict: string; reviewer_notes: string; promoted_to_regression: boolean }>): Promise<ReviewRead> =>
    apiFetch<ReviewRead>(`/reviews/${traceId}`, { method: "PATCH", body: JSON.stringify(body) }),
};

// ---------------------------------------------------------------------------
// Regression
// ---------------------------------------------------------------------------
export const regressionApi = {
  list: (): Promise<RegressionCaseRead[]> =>
    apiFetch<RegressionCaseRead[]>("/regression"),
  get: (id: string): Promise<RegressionCaseRead> =>
    apiFetch<RegressionCaseRead>(`/regression/${id}`),
};

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------
export const promptsApi = {
  list: (): Promise<PromptVersionRead[]> =>
    apiFetch<PromptVersionRead[]>("/prompts"),
  get: (id: string): Promise<PromptVersionRead> =>
    apiFetch<PromptVersionRead>(`/prompts/${id}`),
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export const healthApi = {
  liveness: (): Promise<{ status: string }> =>
    apiFetch("/health"),
  db: (): Promise<{ status: string; database: string }> =>
    apiFetch("/health/db"),
};
