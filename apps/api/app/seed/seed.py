"""
Seed script — populates the database with realistic trace data for demo purposes.
Covers 10 scenario types: policy Q&A, support KB, clinical query, legal/contract,
HR handbook, agent tool-call failure, retrieval miss, timeout, high-cost run,
and high hallucination risk.

Run with: python -m app.seed.seed
"""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.db.init_db import init_db
from app.models.trace import Trace
from app.models.evaluation import Evaluation
from app.models.review import Review
from app.models.prompt_version import PromptVersion
from app.models.regression_case import RegressionCase


# ---------------------------------------------------------------------------
# Prompt versions
# ---------------------------------------------------------------------------
PROMPT_V1 = {
    "version_label": "v1.0",
    "description": "Initial baseline prompt. Minimal context injection.",
    "system_prompt": (
        "You are a helpful assistant. Answer the user's question using only the "
        "provided context. If the context does not contain enough information, say "
        "you don't know. Be concise and accurate."
    ),
    "is_active": False,
}

PROMPT_V2 = {
    "version_label": "v1.1-context-injection",
    "description": "Improved context framing. Instructs model to cite sources explicitly.",
    "system_prompt": (
        "You are an enterprise knowledge assistant. Answer the user's question "
        "strictly based on the retrieved context below. Always cite the source "
        "document for each claim. If the context is insufficient, respond with: "
        "'The available documents do not contain enough information to answer this.' "
        "Do not speculate or add information not present in the context."
    ),
    "is_active": True,
}


# ---------------------------------------------------------------------------
# Seed trace scenarios
# ---------------------------------------------------------------------------
def _ts(days_ago: float, hours: float = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours)


TRACES = [
    # 1. Policy document Q&A — success, good scores
    {
        "run_id": "run_pol_001",
        "created_at": _ts(6, 2),
        "run_type": "rag",
        "environment": "production",
        "user_query": "What is the company's data retention policy for customer PII?",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "Customer PII must be retained for no more than 36 months from last activity. After this period, all identifiable data must be purged from primary and backup systems per GDPR Article 17.", "source": "data-retention-policy-v3.pdf", "score": 0.91, "chunk_index": 4},
            {"content": "Anonymized analytics data may be retained indefinitely. PII includes name, email, IP address, and any device identifiers.", "source": "data-retention-policy-v3.pdf", "score": 0.87, "chunk_index": 5},
        ],
        "final_answer": "Per the Data Retention Policy v3, customer PII must be retained for no more than 36 months from the date of last activity. After this period, all identifiable data—including name, email, IP address, and device identifiers—must be purged from both primary and backup systems in accordance with GDPR Article 17. Anonymized analytics data may be retained indefinitely.",
        "status": "success",
        "latency_ms": 1240,
        "prompt_tokens": 512,
        "completion_tokens": 98,
        "total_tokens": 610,
        "estimated_cost_usd": 0.003660,
        "tags": ["policy", "gdpr", "pii"],
        "eval": {"groundedness": 0.821, "context_relevance": 0.874, "answer_completeness": 0.910, "citation_support": 0.750, "hallucination_risk": "low"},
        "review": {"verdict": "good", "reviewer_notes": "Accurate citation of policy document. Approve for regression suite."},
    },

    # 2. Support KB — success, medium scores
    {
        "run_id": "run_sup_002",
        "created_at": _ts(5, 4),
        "run_type": "rag",
        "environment": "production",
        "user_query": "How do I reset my API key in the developer portal?",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "To reset your API key: navigate to Settings > API Keys, click 'Rotate Key', and confirm. The old key is invalidated immediately.", "source": "support-kb/api-keys.md", "score": 0.93, "chunk_index": 1},
            {"content": "API keys can also be managed via the CLI using `agentops keys rotate --confirm`.", "source": "support-kb/cli-reference.md", "score": 0.78, "chunk_index": 12},
        ],
        "final_answer": "To reset your API key: go to Settings > API Keys in the developer portal and click 'Rotate Key'. Confirm the rotation — the old key is invalidated immediately. Alternatively, use the CLI: `agentops keys rotate --confirm`.",
        "status": "success",
        "latency_ms": 980,
        "prompt_tokens": 380,
        "completion_tokens": 72,
        "total_tokens": 452,
        "estimated_cost_usd": 0.002712,
        "tags": ["support", "api-keys", "developer-portal"],
        "eval": {"groundedness": 0.762, "context_relevance": 0.891, "answer_completeness": 0.840, "citation_support": 0.500, "hallucination_risk": "low"},
        "review": {"verdict": "good", "reviewer_notes": "Correct. Both portal and CLI paths covered."},
    },

    # 3. Clinical-style document query — success, high groundedness needed
    {
        "run_id": "run_clin_003",
        "created_at": _ts(4, 1),
        "run_type": "rag",
        "environment": "staging",
        "user_query": "What are the contraindications for administering Protocol X in patients with renal impairment?",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "Protocol X is contraindicated in patients with eGFR < 30 mL/min/1.73m². Dose adjustment is required for eGFR 30–60. Monitor serum creatinine every 48 hours during administration.", "source": "clinical-protocols/protocol-x-v2.1.pdf", "score": 0.96, "chunk_index": 8},
            {"content": "Renal function should be assessed prior to initiating Protocol X. Patients on dialysis should not receive Protocol X.", "source": "clinical-protocols/protocol-x-v2.1.pdf", "score": 0.94, "chunk_index": 9},
        ],
        "final_answer": "Protocol X is contraindicated in patients with eGFR < 30 mL/min/1.73m² and in those on dialysis. For patients with eGFR between 30–60, dose adjustment is required. Serum creatinine should be monitored every 48 hours during administration. Renal function must be assessed before initiating treatment.",
        "status": "success",
        "latency_ms": 1580,
        "prompt_tokens": 620,
        "completion_tokens": 110,
        "total_tokens": 730,
        "estimated_cost_usd": 0.004380,
        "tags": ["clinical", "protocol-x", "contraindications"],
        "eval": {"groundedness": 0.912, "context_relevance": 0.958, "answer_completeness": 0.950, "citation_support": 0.900, "hallucination_risk": "low"},
        "review": {"verdict": "good", "reviewer_notes": "Highly grounded. Good candidate for regression test case."},
    },

    # 4. Legal/contract clause query — success, medium groundedness
    {
        "run_id": "run_leg_004",
        "created_at": _ts(3, 6),
        "run_type": "rag",
        "environment": "production",
        "user_query": "Does the MSA include an automatic renewal clause and what is the opt-out window?",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "Section 12.3 — Term and Renewal: This Agreement automatically renews for successive one-year terms unless either party provides written notice of non-renewal at least 60 days prior to the end of the then-current term.", "source": "contracts/master-services-agreement-v4.docx", "score": 0.88, "chunk_index": 22},
        ],
        "final_answer": "Yes. Per Section 12.3 of the MSA, the agreement automatically renews for successive one-year terms. To opt out, either party must provide written notice of non-renewal at least 60 days before the end of the current term.",
        "status": "success",
        "latency_ms": 1120,
        "prompt_tokens": 410,
        "completion_tokens": 68,
        "total_tokens": 478,
        "estimated_cost_usd": 0.002868,
        "tags": ["legal", "msa", "contract", "renewal"],
        "eval": {"groundedness": 0.798, "context_relevance": 0.842, "answer_completeness": 0.870, "citation_support": 0.850, "hallucination_risk": "low"},
        "review": None,
    },

    # 5. HR handbook query — success, decent scores
    {
        "run_id": "run_hr_005",
        "created_at": _ts(2, 3),
        "run_type": "rag",
        "environment": "production",
        "user_query": "How many days of paid parental leave are employees entitled to?",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "Employees who have been with the company for at least 12 months are entitled to 16 weeks of fully paid parental leave, applicable to both primary and secondary caregivers.", "source": "hr-handbook-2024.pdf", "score": 0.95, "chunk_index": 31},
            {"content": "Parental leave may be taken in one continuous block or split into two separate periods within 12 months of the child's birth or adoption.", "source": "hr-handbook-2024.pdf", "score": 0.89, "chunk_index": 32},
        ],
        "final_answer": "Employees with at least 12 months of tenure are entitled to 16 weeks of fully paid parental leave, available to both primary and secondary caregivers. The leave may be taken as one continuous block or split into two periods, provided both are taken within 12 months of birth or adoption.",
        "status": "success",
        "latency_ms": 1050,
        "prompt_tokens": 390,
        "completion_tokens": 85,
        "total_tokens": 475,
        "estimated_cost_usd": 0.002850,
        "tags": ["hr", "parental-leave", "policy"],
        "eval": {"groundedness": 0.856, "context_relevance": 0.921, "answer_completeness": 0.900, "citation_support": 0.800, "hallucination_risk": "low"},
        "review": {"verdict": "good", "reviewer_notes": "Correct and well-cited."},
    },

    # 6. Agent tool-call failure — error status
    {
        "run_id": "run_agent_006",
        "created_at": _ts(1, 5),
        "run_type": "agent",
        "environment": "production",
        "user_query": "Fetch the latest quarterly revenue figures and summarize trends.",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [],
        "tool_calls": [
            {"name": "fetch_financial_report", "input": {"period": "Q1-2025", "format": "json"}, "output": None, "latency_ms": 4200, "status": "error"},
            {"name": "fetch_financial_report", "input": {"period": "Q1-2025", "format": "csv"}, "output": None, "latency_ms": 3100, "status": "error"},
        ],
        "final_answer": None,
        "status": "error",
        "error_message": "Tool 'fetch_financial_report' failed after 2 retries. Remote data service returned HTTP 503. Revenue data unavailable.",
        "latency_ms": 8640,
        "prompt_tokens": 290,
        "completion_tokens": 0,
        "total_tokens": 290,
        "estimated_cost_usd": 0.001740,
        "tags": ["agent", "tool-failure", "financial"],
        "eval": {"groundedness": None, "context_relevance": None, "answer_completeness": None, "citation_support": None, "hallucination_risk": "high"},
        "review": {"verdict": "bad", "reviewer_notes": "Tool retry logic not implemented. Escalate to platform team. Mark for regression."},
    },

    # 7. Retrieval miss — success status but low groundedness
    {
        "run_id": "run_miss_007",
        "created_at": _ts(1, 2),
        "run_type": "rag",
        "environment": "production",
        "user_query": "What is our policy on cryptocurrency payments from enterprise clients?",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "Accepted payment methods include wire transfer, ACH, and major credit cards for enterprise contracts.", "source": "billing-policy-v2.pdf", "score": 0.41, "chunk_index": 7},
        ],
        "final_answer": "The available documents do not contain enough information to answer this. The billing policy mentions wire transfer, ACH, and credit cards as accepted methods, but does not address cryptocurrency payments.",
        "status": "success",
        "latency_ms": 1380,
        "prompt_tokens": 310,
        "completion_tokens": 48,
        "total_tokens": 358,
        "estimated_cost_usd": 0.002148,
        "tags": ["retrieval-miss", "billing", "payments"],
        "eval": {"groundedness": 0.312, "context_relevance": 0.284, "answer_completeness": 0.510, "citation_support": 0.200, "hallucination_risk": "medium"},
        "review": {"verdict": "needs_improvement", "reviewer_notes": "Retrieval failed to find relevant chunks. Consider expanding document corpus or improving chunking strategy."},
    },

    # 8. Timeout — timeout status
    {
        "run_id": "run_timeout_008",
        "created_at": _ts(0, 8),
        "run_type": "rag",
        "environment": "production",
        "user_query": "Provide a comprehensive comparison of all vendor contracts signed in 2023 and 2024.",
        "system_prompt": PROMPT_V1["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [],
        "final_answer": None,
        "status": "timeout",
        "error_message": "Request exceeded maximum latency threshold of 30000ms. Retrieval pipeline did not complete.",
        "latency_ms": 30000,
        "prompt_tokens": 180,
        "completion_tokens": 0,
        "total_tokens": 180,
        "estimated_cost_usd": 0.001080,
        "tags": ["timeout", "retrieval", "large-query"],
        "eval": {"groundedness": None, "context_relevance": None, "answer_completeness": None, "citation_support": None, "hallucination_risk": "high"},
        "review": None,
    },

    # 9. High-cost long-context run
    {
        "run_id": "run_highcost_009",
        "created_at": _ts(0, 4),
        "run_type": "rag",
        "environment": "production",
        "user_query": "Summarize all compliance obligations across the EU AI Act, GDPR, and our internal AI governance policy.",
        "system_prompt": PROMPT_V2["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "EU AI Act Article 6: High-risk AI systems must undergo conformity assessment before market placement. Providers must maintain technical documentation and register in the EU database.", "source": "eu-ai-act-summary.pdf", "score": 0.89, "chunk_index": 14},
            {"content": "GDPR Article 22 prohibits solely automated decision-making with legal effects unless explicit consent is given or it is necessary for contract performance.", "source": "gdpr-compliance-guide.pdf", "score": 0.86, "chunk_index": 9},
            {"content": "Internal AI Governance Policy v2: All AI models must pass a bias audit before production deployment. Shadow mode testing required for 30 days minimum.", "source": "internal-ai-governance-v2.pdf", "score": 0.82, "chunk_index": 3},
            {"content": "EU AI Act Article 13 mandates transparency obligations: users must be informed when interacting with an AI system.", "source": "eu-ai-act-summary.pdf", "score": 0.80, "chunk_index": 18},
        ],
        "final_answer": "Across the EU AI Act, GDPR, and internal governance policy, the key compliance obligations are: (1) Conformity assessment and EU database registration for high-risk AI systems (EU AI Act Art. 6). (2) Transparency disclosure to users interacting with AI (EU AI Act Art. 13). (3) Prohibition on fully automated legal decisions without consent (GDPR Art. 22). (4) Bias audits and minimum 30-day shadow testing before production deployment (Internal AI Governance v2). Each framework applies independently and obligations may overlap for the same system.",
        "status": "success",
        "latency_ms": 4820,
        "prompt_tokens": 8240,
        "completion_tokens": 310,
        "total_tokens": 8550,
        "estimated_cost_usd": 0.051300,
        "tags": ["compliance", "eu-ai-act", "gdpr", "governance", "long-context"],
        "eval": {"groundedness": 0.743, "context_relevance": 0.811, "answer_completeness": 0.880, "citation_support": 0.750, "hallucination_risk": "low"},
        "review": None,
    },

    # 10. High hallucination risk — model adds ungrounded claims
    {
        "run_id": "run_hallu_010",
        "created_at": _ts(0, 1),
        "run_type": "rag",
        "environment": "production",
        "user_query": "What SLA guarantees do we offer for the enterprise tier?",
        "system_prompt": PROMPT_V1["system_prompt"],
        "model": "gpt-4o",
        "provider": "openai",
        "retrieved_chunks": [
            {"content": "Enterprise customers receive priority support with a 4-hour initial response time for P1 incidents.", "source": "enterprise-sla-v1.pdf", "score": 0.62, "chunk_index": 2},
        ],
        "final_answer": "Enterprise tier customers receive a 99.99% uptime SLA with financial penalties for breaches, 4-hour response for P1 incidents, dedicated account managers, and 24/7 phone support with a guaranteed 15-minute escalation path.",
        "status": "success",
        "latency_ms": 1190,
        "prompt_tokens": 340,
        "completion_tokens": 76,
        "total_tokens": 416,
        "estimated_cost_usd": 0.002496,
        "tags": ["sla", "enterprise", "hallucination-flagged"],
        "eval": {"groundedness": 0.143, "context_relevance": 0.521, "answer_completeness": 0.780, "citation_support": 0.100, "hallucination_risk": "high"},
        "review": {"verdict": "bad", "reviewer_notes": "Model fabricated 99.99% uptime, dedicated AM, and 24/7 phone support. These are not in the source document. Critical hallucination — remove from any training set."},
    },
]


REGRESSION_CASES = [
    {
        "name": "PII Retention Policy — Standard Query",
        "user_query": "What is the company's data retention policy for customer PII?",
        "expected_behavior": "Answer should state 36-month maximum retention, cite data-retention-policy-v3.pdf, mention GDPR Article 17, and specify what counts as PII.",
        "tags": ["policy", "gdpr", "pii"],
    },
    {
        "name": "SLA Query — No Hallucination",
        "user_query": "What SLA guarantees do we offer for the enterprise tier?",
        "expected_behavior": "Answer should only state what is in the source document (4-hour P1 response). Must NOT mention uptime percentages, dedicated account managers, or phone support unless documented.",
        "tags": ["sla", "enterprise", "hallucination-guard"],
    },
    {
        "name": "Parental Leave Entitlement",
        "user_query": "How many days of paid parental leave are employees entitled to?",
        "expected_behavior": "Answer should state 16 weeks, applicable to both primary and secondary caregivers, with 12-month tenure requirement. May be split into two blocks.",
        "tags": ["hr", "parental-leave"],
    },
]


async def seed(db: AsyncSession) -> None:
    from sqlalchemy import select, func

    # Skip if already seeded
    count = (await db.execute(select(func.count(Trace.id)))).scalar_one()
    if count > 0:
        print(f"Database already contains {count} traces — skipping seed.")
        return

    print("Seeding prompt versions...")
    pv1 = PromptVersion(**PROMPT_V1)
    pv2 = PromptVersion(**PROMPT_V2)
    db.add_all([pv1, pv2])
    await db.flush()

    print("Seeding traces, evaluations, and reviews...")
    for t_data_orig in TRACES:
        # Copy to avoid mutating the module-level list on repeated seed() calls
        t_data = dict(t_data_orig)
        eval_data = t_data.pop("eval", None)
        review_data = t_data.pop("review", None)

        trace = Trace(
            prompt_version_id=pv2.id,
            **t_data,
        )
        db.add(trace)
        await db.flush()

        if eval_data:
            ev = Evaluation(trace_id=trace.id, evaluator="deterministic-v1", **eval_data)
            db.add(ev)

        if review_data:
            rv = Review(trace_id=trace.id, **review_data)
            db.add(rv)

        await db.flush()

    print("Seeding regression cases...")
    for rc_data in REGRESSION_CASES:
        rc = RegressionCase(prompt_version_a=pv1.id, prompt_version_b=pv2.id, **rc_data)
        db.add(rc)

    await db.commit()
    print("Seed complete.")


async def main() -> None:
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())
