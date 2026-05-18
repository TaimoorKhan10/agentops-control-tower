# Architecture — AgentOps Control Tower

## System Overview

AgentOps Control Tower is a self-hostable observability and evaluation platform for RAG systems and LLM agents. It is structured as a monorepo with three independently deployable components.

```
agentops-control-tower/
  apps/api/      ← FastAPI backend  (Python 3.11)
  apps/web/      ← Next.js frontend (Node 20 LTS)
  examples/      ← Demo RAG app     (Python 3.11 + FAISS)
```

## Request Flow

```
User Browser
    │
    ▼
Next.js (port 3000)
    │  REST JSON
    ▼
FastAPI (port 8000)
    │
    ├── API Layer      (routes/*)
    ├── Service Layer  (services/*)
    ├── ORM Layer      (models/* via SQLAlchemy 2.x async)
    │
    ▼
PostgreSQL 15 (port 5432)

Demo RAG App (port 8001)
    │  POST /api/v1/ingest/trace
    ▼
FastAPI (port 8000) → auto-evaluate → persist
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| REST over GraphQL | Simpler to document, trace, and cache for a v1 observability tool |
| SQLAlchemy 2.x async | Full async stack; Alembic-compatible; type-safe with `Mapped` |
| JSONB for flexible fields | `retrieved_chunks`, `tool_calls`, `metadata` vary by run type; JSONB avoids premature normalization |
| Deterministic evaluator in v1 | Honest MVP boundary; interface designed for LLM-as-judge swap in v2 |
| No auth in v1 | Single-tenant, self-hosted focus; auth adds complexity with no user-visible value in this scope |
| Single-table trace model | Spans deferred to v3 (see roadmap); avoids over-engineering retrieval for a v1 demo |

## Layer Responsibilities

### API Layer (`app/api/routes/`)
- HTTP contract only: request parsing, response shaping, HTTP status codes
- No business logic — delegates everything to the service layer

### Service Layer (`app/services/`)
- All business logic: filtering, aggregation, scoring, upserts
- Returns SQLAlchemy model instances or Pydantic schemas
- Does not know about HTTP

### Model Layer (`app/models/`)
- SQLAlchemy ORM definitions
- JSONB fields for variable-structure data
- Relationships: `Trace` 1:1 `Evaluation`, `Trace` 1:1 `Review`

### Schema Layer (`app/schemas/`)
- Pydantic v2 models for request/response contracts
- Separate from ORM models — each owns its own concern
- `TraceRead` includes nested `EvaluationRead` and `ReviewRead`

## Database Entity Map

```
prompt_versions ──< traces >── evaluations
                      │
                      └──────── reviews

regression_cases (optionally linked to traces and prompt_versions)
```

## Evaluation Pipeline (v1)

```
Trace created
    │
    ▼
eval_service._compute_scores()
    ├── groundedness       ← keyword overlap(answer, context)
    ├── context_relevance  ← keyword overlap(query, context)
    ├── answer_completeness ← length ratio heuristic
    ├── citation_support   ← source string presence in answer
    └── hallucination_risk ← inverse of groundedness
    │
    ▼
Evaluation row persisted
```

All scores are labeled `evaluator: "deterministic-v1"`. The evaluation methodology document explains why this is not production-grade and what an LLM-as-judge upgrade requires.
