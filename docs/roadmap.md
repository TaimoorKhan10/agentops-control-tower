# Roadmap — AgentOps Control Tower

> This document tracks the planned evolution of the platform beyond MVP v1.
> All v1 limitations are noted honestly. No speculative features are presented as committed.

---

## v1 — Current MVP

### What is implemented
- Full trace ingestion and storage (RAG, agent, chat run types)
- `run_type` and `environment` fields on every trace for filtering
- Deterministic evaluation scoring (groundedness, context relevance, completeness, citation support, hallucination risk)
- Human review queue with verdict and notes
- Prompt version tracking and activation management
- Regression test case storage with deterministic mock A/B comparison
- Dashboard KPI metrics computed from live DB data
- Demo RAG app that writes real traces into the platform
- Docker Compose single-command local setup

### Known limitations of v1
- Evaluation scores are heuristic placeholders — not suitable for production quality assessment
- No authentication or access control — single-tenant, local/self-hosted only
- A/B prompt comparison uses deterministic mock outputs, not real LLM execution
- FAISS is used only in the demo RAG app — not integrated into the main platform
- No real-time streaming or websocket support
- No alerting or notification system

---

## v2 — Near-term

### LLM-as-Judge Evaluation
Replace the `deterministic-v1` evaluator with an LLM-as-judge pipeline.
- The `evaluator` field on `Evaluation` is the toggle point — no API changes needed
- Target evaluators: GPT-4o, Gemini 1.5 Pro, Claude 3.5 Sonnet
- Configurable rubric per evaluation dimension
- Prompt template versioning for the evaluator itself

### Real Regression Test Execution
Replace the `deterministic-mock-v1` comparison with live LLM execution.
- Execute both prompt versions against the LLM
- Score results through the evaluation pipeline
- Store detailed diff between A and B outputs

### Multi-Provider LLM Support
The provider abstraction in the demo RAG app (v1) is designed for extension:
```
providers/
  openai.py    ← implemented in v1
  gemini.py    ← v2
  anthropic.py ← v2
  bedrock.py   ← v3
```

---

## v3 — Medium-term

### Trace Spans (Distributed Tracing)

Future `trace_spans` table — planned schema:

```sql
CREATE TABLE trace_spans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id      UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    parent_span_id UUID REFERENCES trace_spans(id),
    span_type     VARCHAR(16) NOT NULL,
    -- span_type values: retrieval | llm_call | tool_call | evaluator | error
    name          VARCHAR(128) NOT NULL,
    input_payload JSONB,
    output_payload JSONB,
    latency_ms    INTEGER,
    status        VARCHAR(16),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trace_spans_trace_id ON trace_spans(trace_id);
CREATE INDEX idx_trace_spans_parent ON trace_spans(parent_span_id);
```

This enables a Jaeger/Tempo-style waterfall view inside the trace detail page,
showing retrieval → LLM call → evaluator spans with individual latencies.
Not in MVP to avoid over-engineering a feature that requires instrumentation
changes throughout the pipeline.

### Multi-Project / Multi-Tenant Support

Planned architecture for multi-project grouping:

```
projects
  id
  name
  slug
  owner_id  → users.id
  
traces
  project_id → projects.id   ← new FK
  environment
  customer_id (optional)
```

This allows traces to be grouped by:
- **App / project** — separate RAG systems (e.g. "legal-assistant" vs "hr-chatbot")
- **Environment** — development, staging, production (already in v1 as a field)
- **Customer** — multi-tenant SaaS deployments
- **Team** — shared observability across engineering teams

MVP is deliberately single-tenant. The `environment` and `tags` fields on `Trace`
provide the same filtering surface at smaller scale.

---

## v4 — Long-term

- OpenTelemetry (OTEL) trace ingestion — accept OTEL spans directly
- Fine-tuning dataset export — annotated traces → JSONL for SFT
- Slack / PagerDuty alerting on hallucination rate spikes
- Benchmark comparisons across model versions
- Token budget enforcement and cost alerts
- Kubernetes Helm chart for production deployment
- S3/GCS blob storage for large trace payloads
- SSO / OIDC authentication

---

*This roadmap is aspirational. Priorities will be updated based on real-world usage.*
