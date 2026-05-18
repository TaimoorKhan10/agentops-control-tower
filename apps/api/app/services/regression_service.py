"""
Regression service — test case CRUD and A/B prompt comparison.

In v1, comparison returns a deterministic mock result.
The schema matches what real LLM execution would return for a v2 drop-in swap.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import RegressionCaseNotFound, PromptVersionNotFound
from app.models.regression_case import RegressionCase
from app.models.prompt_version import PromptVersion
from app.schemas.regression import RegressionCaseCreate, CompareResult


async def list_regression_cases(db: AsyncSession) -> list[RegressionCase]:
    result = await db.execute(
        select(RegressionCase).order_by(RegressionCase.created_at.desc())
    )
    return list(result.scalars().all())


async def get_regression_case(db: AsyncSession, case_id: uuid.UUID) -> RegressionCase:
    result = await db.execute(select(RegressionCase).where(RegressionCase.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise RegressionCaseNotFound(str(case_id))
    return case


async def create_regression_case(db: AsyncSession, data: RegressionCaseCreate) -> RegressionCase:
    case = RegressionCase(
        name=data.name,
        user_query=data.user_query,
        expected_behavior=data.expected_behavior,
        reference_context=data.reference_context,
        tags=data.tags,
        source_trace_id=data.source_trace_id,
        prompt_version_a=data.prompt_version_a,
        prompt_version_b=data.prompt_version_b,
    )
    db.add(case)
    await db.flush()
    await db.refresh(case)
    return case


def _mock_comparison(case: RegressionCase, pv_a: PromptVersion, pv_b: PromptVersion) -> dict:
    """
    MVP placeholder for A/B comparison.
    In v2, replace with real LLM execution and scoring pipeline.
    """
    a_score = round(min(len(pv_a.system_prompt) / 500, 1.0) * 0.7 + 0.3, 3)
    b_score = round(min(len(pv_b.system_prompt) / 500, 1.0) * 0.7 + 0.3, 3)
    winner = "a" if a_score > b_score else ("b" if b_score > a_score else "tie")
    return {
        "result_a": {
            "prompt_version": pv_a.version_label,
            "mock_answer": f"[Mock — {pv_a.version_label} on: '{case.user_query[:60]}']",
            "groundedness": a_score,
            "answer_completeness": round(a_score * 0.95, 3),
        },
        "result_b": {
            "prompt_version": pv_b.version_label,
            "mock_answer": f"[Mock — {pv_b.version_label} on: '{case.user_query[:60]}']",
            "groundedness": b_score,
            "answer_completeness": round(b_score * 0.95, 3),
        },
        "winner": winner,
        "comparison_method": "deterministic-mock-v1",
        "notes": "MVP placeholder. Upgrade to LLM execution in v2.",
        "ran_at": datetime.now(timezone.utc).isoformat(),
    }


async def run_comparison(
    db: AsyncSession,
    case_id: uuid.UUID,
    prompt_version_a: uuid.UUID,
    prompt_version_b: uuid.UUID,
) -> CompareResult:
    case = await get_regression_case(db, case_id)

    pv_a = (await db.execute(select(PromptVersion).where(PromptVersion.id == prompt_version_a))).scalar_one_or_none()
    if not pv_a:
        raise PromptVersionNotFound(str(prompt_version_a))

    pv_b = (await db.execute(select(PromptVersion).where(PromptVersion.id == prompt_version_b))).scalar_one_or_none()
    if not pv_b:
        raise PromptVersionNotFound(str(prompt_version_b))

    result_data = _mock_comparison(case, pv_a, pv_b)
    case.comparison_result = result_data
    case.prompt_version_a = prompt_version_a
    case.prompt_version_b = prompt_version_b
    await db.flush()

    return CompareResult(
        case_id=case_id,
        prompt_version_a=prompt_version_a,
        prompt_version_b=prompt_version_b,
        **result_data,
    )
