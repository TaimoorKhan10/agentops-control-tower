# Failure Taxonomy — AgentOps Control Tower

This document classifies the failure modes observable in the platform.
Understanding failure taxonomy helps with filtering, alerting (v3), and regression suite design.

---

## Trace-Level Failures

### `status: error`
The pipeline reached the model but received an error response, or a downstream tool call failed.

**Common causes:**
- Tool call returned HTTP 4xx/5xx after retries exhausted
- Model API returned an error (rate limit, context length exceeded, content filter)
- Retrieval pipeline threw an unhandled exception

**Indicators in trace:**
- `status = "error"`
- `error_message` populated
- `final_answer = null`
- `tool_calls[*].status = "error"` (for agent runs)

### `status: timeout`
The pipeline exceeded the configured latency threshold before completing.

**Common causes:**
- Retrieval over very large document corpora
- Model provider latency spike
- Missing query timeout enforcement in the pipeline

**Indicators:**
- `status = "timeout"`
- `latency_ms` at or near the threshold value
- `final_answer = null`

---

## Evaluation-Level Failures

### Retrieval Miss
The retrieval step returned chunks with low relevance scores, or no chunks at all.

**Detection:** `context_relevance < 0.3` in the evaluation row.

**Common causes:**
- Query uses terminology not present in the document corpus
- Document corpus is too small or not chunked at the right granularity
- Embedding model mismatch between indexing and query time

### High Hallucination Risk
The model's answer contains claims not supported by the retrieved context.

**Detection:** `hallucination_risk = "high"` (groundedness < 0.25 in v1 heuristic).

**Common causes:**
- Retrieval miss: model had insufficient context and filled gaps with training knowledge
- System prompt did not instruct the model to stay grounded
- Long-context dilution: context was too large for the model to attend to correctly

### Low Groundedness with Successful Status
The run completed without errors but the answer is weakly grounded.

**Detection:** `status = "success"` AND `groundedness < 0.4`.

This is the most dangerous failure mode — the system reports success while the answer quality is poor.

---

## Review-Level Failures

### `verdict: bad`
A human reviewer has determined the trace output is incorrect, harmful, or unsuitable for users.

**Action:** These traces should be excluded from training data exports and promoted to regression cases.

### `verdict: needs_improvement`
Output is partially correct or acceptable but has identifiable quality issues.

**Action:** Investigate the specific failure dimension (retrieval? prompt? model?) and update the prompt or corpus accordingly.

---

## Failure Priority Matrix

| Failure Type | Severity | Recommended Action |
|---|---|---|
| `status: error` + agent tool failure | High | Page on-call, inspect tool logs |
| `status: timeout` | High | Investigate retrieval latency, add query timeout |
| `hallucination_risk: high` + `status: success` | Critical | Human review mandatory, exclude from training |
| Retrieval miss (`context_relevance < 0.3`) | Medium | Expand corpus or improve chunking |
| `verdict: bad` | High | Add to regression suite, root cause analysis |
| Low groundedness only | Low-Medium | Monitor trend, trigger prompt review if persistent |
