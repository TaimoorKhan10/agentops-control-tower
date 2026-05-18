"""
Evaluation service — deterministic scoring for v1.

IMPORTANT — MVP BOUNDARY:
The scores produced here are heuristic placeholders computed from
text features (keyword overlap, length ratios, token patterns).
They are NOT LLM-as-judge scores and should not be treated as
production-grade evaluation results.

The public interface (EvaluationCreate schema, trigger endpoint) is
designed to be LLM-agnostic so that swapping in real evaluation
in v2 requires no API changes — only a new implementation of
`_compute_scores()`.
"""
import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import TraceNotFound, EvaluationNotFound
from app.models.trace import Trace
from app.models.evaluation import Evaluation
from app.schemas.evaluation import EvaluationCreate, EvaluationRead


def _keyword_overlap(text_a: str, text_b: str) -> float:
    """Jaccard similarity over lowercased word sets. Range: 0.0–1.0."""
    if not text_a or not text_b:
        return 0.0
    words_a = set(re.findall(r"\w+", text_a.lower()))
    words_b = set(re.findall(r"\w+", text_b.lower()))
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)


def _compute_scores(
    user_query: str,
    final_answer: str | None,
    retrieved_chunks: list[dict[str, Any]] | None,
    system_prompt: str | None,
    status: str,
) -> dict[str, Any]:
    """
    Deterministic heuristic scorer (v1).
    Returns a dict of scores and hallucination_risk.
    """
    if status != "success" or not final_answer:
        return {
            "groundedness": None,
            "context_relevance": None,
            "answer_completeness": None,
            "citation_support": None,
            "hallucination_risk": "high" if status == "error" else None,
            "notes": f"Scoring skipped — trace status is '{status}'.",
        }

    chunks_text = " ".join(c.get("content", "") for c in (retrieved_chunks or []))

    # Groundedness: how much of the answer overlaps with retrieved context
    groundedness = _keyword_overlap(final_answer, chunks_text) if chunks_text else 0.3

    # Context relevance: how much of the context overlaps with the query
    context_relevance = _keyword_overlap(user_query, chunks_text) if chunks_text else 0.2

    # Answer completeness: penalise very short answers relative to query length
    answer_len = len(final_answer.split())
    query_len = len(user_query.split())
    completeness_ratio = min(answer_len / max(query_len * 3, 10), 1.0)
    answer_completeness = round(0.4 + 0.6 * completeness_ratio, 3)

    # Citation support: presence of source identifiers in the answer
    source_terms = [c.get("source", "") for c in (retrieved_chunks or []) if c.get("source")]
    cited = sum(1 for s in source_terms if s.lower() in final_answer.lower())
    citation_support = min(cited / max(len(source_terms), 1), 1.0) if source_terms else 0.0

    # Hallucination risk: inverse of groundedness (simple proxy)
    if groundedness >= 0.45:
        hallucination_risk = "low"
    elif groundedness >= 0.25:
        hallucination_risk = "medium"
    else:
        hallucination_risk = "high"

    return {
        "groundedness": round(groundedness, 3),
        "context_relevance": round(context_relevance, 3),
        "answer_completeness": round(answer_completeness, 3),
        "citation_support": round(citation_support, 3),
        "hallucination_risk": hallucination_risk,
        "notes": "Scored by deterministic-v1 heuristic evaluator. Not production-grade.",
    }


async def run_evaluation(db: AsyncSession, trace_id: uuid.UUID) -> Evaluation:
    """Compute and persist evaluation scores for a trace."""
    result = await db.execute(select(Trace).where(Trace.id == trace_id))
    trace = result.scalar_one_or_none()
    if not trace:
        raise TraceNotFound(str(trace_id))

    scores = _compute_scores(
        user_query=trace.user_query,
        final_answer=trace.final_answer,
        retrieved_chunks=trace.retrieved_chunks,
        system_prompt=trace.system_prompt,
        status=trace.status,
    )

    # Upsert: delete existing evaluation if present, then insert fresh
    existing = await db.execute(select(Evaluation).where(Evaluation.trace_id == trace_id))
    existing_eval = existing.scalar_one_or_none()
    if existing_eval:
        await db.delete(existing_eval)
        await db.flush()

    evaluation = Evaluation(
        trace_id=trace_id,
        evaluator="deterministic-v1",
        **scores,
    )
    db.add(evaluation)
    await db.flush()
    await db.refresh(evaluation)
    return evaluation


async def get_evaluation_by_trace(db: AsyncSession, trace_id: uuid.UUID) -> Evaluation:
    result = await db.execute(select(Evaluation).where(Evaluation.trace_id == trace_id))
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise EvaluationNotFound(str(trace_id))
    return evaluation


async def list_evaluations(
    db: AsyncSession,
    hallucination_risk: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[Evaluation]:
    q = select(Evaluation).order_by(Evaluation.created_at.desc())
    if hallucination_risk:
        q = q.where(Evaluation.hallucination_risk == hallucination_risk)
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return list(result.scalars().all())
