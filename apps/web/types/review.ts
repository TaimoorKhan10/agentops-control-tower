// Review types — mirrors the backend Review schema
export type ReviewVerdict = "good" | "bad" | "needs_improvement";

export interface ReviewRead {
  id: string;
  trace_id: string;
  created_at: string;
  updated_at: string;
  verdict: ReviewVerdict;
  reviewer_notes: string | null;
  promoted_to_regression: boolean;
}

export interface PendingReviewItem {
  id: string;
  run_id: string;
  created_at: string;
  user_query: string;
  status: string;
  groundedness: number | null;
  hallucination_risk: string | null;
}
