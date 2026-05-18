// Prompt version and regression case types

export interface PromptVersionRead {
  id: string;
  created_at: string;
  version_label: string;
  description: string | null;
  system_prompt: string;
  is_active: boolean;
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
  comparison_result: Record<string, unknown> | null;
}
