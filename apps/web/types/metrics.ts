// Dashboard metrics — mirrors the backend DashboardMetrics schema

export interface StatusBreakdown {
  success: number;
  error: number;
  timeout: number;
}

export interface HallucinationBreakdown {
  low: number;
  medium: number;
  high: number;
}

export interface RecentFailure {
  run_id: string;
  user_query: string;
  status: string;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface DashboardMetrics {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  timeout_runs: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  total_estimated_cost_usd: number;
  total_tokens: number;
  avg_groundedness: number | null;
  hallucination_counts: HallucinationBreakdown;
  runs_by_status: StatusBreakdown;
  recent_failures: RecentFailure[];
}
