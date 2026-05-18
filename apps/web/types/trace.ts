import type { EvaluationRead } from "./evaluation";
import type { ReviewRead } from "./review";

// Run type and environment enums
export type RunType = "rag" | "agent" | "chat" | "regression" | "evaluation";
export type RunEnvironment = "development" | "staging" | "production";
export type TraceStatus = "success" | "error" | "timeout";

export interface RetrievedChunk {
  content: string;
  source: string;
  score: number | null;
  chunk_index: number | null;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown> | null;
  output: unknown | null;
  latency_ms: number | null;
  status: string | null;
}

// Full trace detail response
export interface TraceRead {
  id: string;
  run_id: string;
  created_at: string;
  user_query: string;
  system_prompt: string | null;
  prompt_version_id: string | null;
  model: string;
  provider: string;
  run_type: RunType;
  environment: RunEnvironment;
  retrieved_chunks: RetrievedChunk[] | null;
  tool_calls: ToolCall[] | null;
  final_answer: string | null;
  status: TraceStatus;
  error_message: string | null;
  latency_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  tags: string[] | null;
  trace_metadata: Record<string, unknown> | null;
  evaluation: EvaluationRead | null;
  review: ReviewRead | null;
}

// Compact trace row for the list/table view
export interface TraceSummary {
  id: string;
  run_id: string;
  created_at: string;
  user_query: string;
  model: string;
  provider: string;
  run_type: RunType;
  environment: RunEnvironment;
  prompt_version_id: string | null;
  status: TraceStatus;
  latency_ms: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  groundedness: number | null;
  hallucination_risk: string | null;
  review_verdict: string | null;
}

export interface TraceListResponse {
  items: TraceSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface TraceFilters {
  page?: number;
  page_size?: number;
  status?: TraceStatus;
  model?: string;
  provider?: string;
  run_type?: RunType;
  environment?: RunEnvironment;
  hallucination_risk?: string;
  search?: string;
}
