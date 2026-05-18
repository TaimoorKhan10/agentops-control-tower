# Evaluation Methodology — AgentOps Control Tower

> **Important:** The evaluation system in v1 uses deterministic heuristics.
> It is an honest MVP placeholder, not a production-grade evaluation framework.
> This document explains exactly what the scores mean and do not mean.

---

## v1: Deterministic Heuristic Evaluator (`deterministic-v1`)

All evaluation scores are produced by `app/services/eval_service.py`.
The `evaluator` field on every `Evaluation` row is set to `"deterministic-v1"`.

### Scoring Dimensions

| Dimension | Method | Range | Interpretation |
|---|---|---|---|
| `groundedness` | Jaccard similarity between answer tokens and retrieved context tokens | 0.0–1.0 | Higher = answer is more grounded in retrieved context |
| `context_relevance` | Jaccard similarity between query tokens and retrieved context tokens | 0.0–1.0 | Higher = retrieved context is more relevant to the query |
| `answer_completeness` | Length ratio: answer word count vs (query length × 3), capped at 1.0 | 0.0–1.0 | Higher = answer is proportionally substantial |
| `citation_support` | Fraction of source filenames that appear verbatim in the answer | 0.0–1.0 | Higher = answer explicitly references its sources |
| `hallucination_risk` | Derived from groundedness: ≥0.45 → low, ≥0.25 → medium, <0.25 → high | low/medium/high | Risk that the answer contains claims not in the context |

### Known Limitations

1. **Jaccard similarity is not semantic similarity.** Synonym use, paraphrasing, or technical abbreviations all reduce apparent groundedness even when the answer is factually correct.
2. **Length heuristics penalize concise answers.** A correct 10-word answer scores lower on completeness than a verbose 100-word answer.
3. **Citation support requires exact filename match.** A model citing "the policy document" instead of "data-retention-policy-v3.pdf" scores 0.
4. **Hallucination risk is a proxy, not a detection system.** Low groundedness is a signal, not proof of hallucination.
5. **Scores are not comparable across different document corpora.** A groundedness score of 0.6 on a dense legal document means something different from 0.6 on a short FAQ.

### What These Scores Are Useful For

- **Relative comparison** between traces run against the same document corpus
- **Identifying retrieval misses** (very low context_relevance)
- **Flagging runs for human review** (high hallucination_risk → review queue)
- **Regression testing** prompt changes relative to each other (not absolute quality)

---

## v2: LLM-as-Judge Evaluator (Planned)

The upgrade path requires only replacing `_compute_scores()` in `eval_service.py`.
The API contract, database schema, and frontend remain unchanged.

### Planned approach

```python
# eval_service.py — v2 drop-in
async def _compute_scores_llm_judge(
    user_query, final_answer, retrieved_chunks, system_prompt, status
) -> dict:
    # Call GPT-4o / Gemini 1.5 Pro with a structured evaluation rubric
    # Return same dict shape as _compute_scores()
    ...
```

### Evaluation rubric (planned)
- Groundedness: "Does the answer contain only claims supported by the context? Score 0–1."
- Context relevance: "Is the retrieved context relevant to the question? Score 0–1."
- Answer completeness: "Does the answer fully address the question? Score 0–1."
- Citation support: "Does the answer identify its sources? Score 0–1."
- Hallucination risk: "Classify the risk of hallucination as low, medium, or high."

The `evaluator` field will change to `"llm-judge-gpt4o"` or similar to preserve audit trail of which scores were produced by which method.
