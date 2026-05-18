# Trace Schema — AgentOps Control Tower

Every AI invocation captured by AgentOps Control Tower produces one **Trace** record.
This document is the canonical reference for the trace data model.

---

## Core Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | auto | Primary key |
| `run_id` | string (64) | yes | Human-readable unique run identifier. Format: `run_{type}_{sequence}` |
| `created_at` | timestamptz | auto | UTC timestamp of trace creation |
| `run_type` | enum | yes | `rag` \| `agent` \| `chat` \| `regression` \| `evaluation` |
| `environment` | enum | yes | `development` \| `staging` \| `production` |

## Query and Prompt Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `user_query` | text | yes | The raw user question or input |
| `system_prompt` | text | no | Full system prompt in effect at run time |
| `prompt_version_id` | UUID FK | no | Which `prompt_versions` row was active |

## Model and Provider Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string (64) | yes | Model identifier: `gpt-4o`, `claude-3-5-sonnet`, `mock` |
| `provider` | string (32) | yes | Provider: `openai`, `anthropic`, `google`, `mock` |

## RAG Context Fields

`retrieved_chunks` is a JSONB array. Each element:

```json
{
  "content": "string — the chunk text",
  "source": "string — filename or document ID",
  "score": 0.91,
  "chunk_index": 4
}
```

## Agent Tool Call Fields

`tool_calls` is a JSONB array. Each element:

```json
{
  "name": "string — tool function name",
  "input": { "key": "value" },
  "output": "any — tool return value or null on failure",
  "latency_ms": 420,
  "status": "success | error"
}
```

## Output and Status Fields

| Field | Type | Description |
|---|---|---|
| `final_answer` | text | The model's final response to the user |
| `status` | enum | `success` \| `error` \| `timeout` |
| `error_message` | text | Populated when `status != success` |

## Performance Fields

| Field | Type | Description |
|---|---|---|
| `latency_ms` | integer | End-to-end wall-clock time in milliseconds |
| `prompt_tokens` | integer | Tokens in the prompt (input) |
| `completion_tokens` | integer | Tokens in the completion (output) |
| `total_tokens` | integer | `prompt_tokens + completion_tokens` |
| `estimated_cost_usd` | numeric(10,6) | Estimated cost at time of run |

## Flexible Fields

| Field | Type | Description |
|---|---|---|
| `tags` | JSONB array | String labels: `["policy", "gdpr"]` |
| `trace_metadata` | JSONB object | Arbitrary key-value pairs for custom context. Named `trace_metadata` (not `metadata`) to avoid conflict with SQLAlchemy internals. |

---

## Related Entities

### Evaluation (1:1 with Trace)
See `evaluation-methodology.md` for scoring details.

### Review (1:1 with Trace)
| Field | Values |
|---|---|
| `verdict` | `good` \| `bad` \| `needs_improvement` |
| `reviewer_notes` | Free text |
| `promoted_to_regression` | Boolean |

---

## Ingestion

Traces are written via:
- `POST /api/v1/traces` — direct API call
- `POST /api/v1/ingest/trace` — ingest endpoint (auto-evaluates on receipt)

The ingest endpoint is the preferred path for external systems (e.g. the demo RAG app).
