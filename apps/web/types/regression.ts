// Prompt version and regression case types

export interface PromptVersionRead {
  id: string;
  created_at: string;
  version_label: string;
  description: string | null;
  system_prompt: string;
  is_active: boolean;
}

// Per-side result inside a comparison
export interface CompareResultItem {
  prompt_version: string;
  mock_answer: string;
  groundedness: number;
  answer_completeness: number;
}

// Full A/B comparison result (API response from POST /regression/{id}/compare)
export interface CompareResult {
  case_id: string;
  prompt_version_a: string;
  prompt_version_b: string;
  result_a: CompareResultItem;
  result_b: CompareResultItem;
  winner: "a" | "b" | "tie" | null;
  comparison_method: string;
  notes: string | null;
}

export interface RegressionCaseRead {
  id: string;
  created_at: string;
  name: string;
  user_query: string;
  expected_behavior: string;
  reference_context: Array<{ content: string; source: string }> | null;
  tags: string[] | null;
  source_trace_id: string | null;
  prompt_version_a: string | null;
  prompt_version_b: string | null;
  // Typed strictly — null until a comparison is run
  comparison_result: CompareResult | null;
}
