// Evaluation scores and risk — mirrors the backend Evaluation schema
export type HallucinationRisk = "low" | "medium" | "high";

export interface EvaluationRead {
  id: string;
  trace_id: string;
  created_at: string;
  groundedness: number | null;
  context_relevance: number | null;
  answer_completeness: number | null;
  citation_support: number | null;
  hallucination_risk: HallucinationRisk | null;
  evaluator: string;
  notes: string | null;
}
