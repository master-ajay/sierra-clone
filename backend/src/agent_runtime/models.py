from typing import Literal

from pydantic import BaseModel


class Chunk(BaseModel):
    id: str
    text: str
    source: str
    score: float = 0.0


class GuardrailTrace(BaseModel):
    faithfulness_score: float
    threshold: float
    passed: bool


class RetrievalTrace(BaseModel):
    vector_results: list[Chunk]
    bm25_results: list[Chunk]
    fused_results: list[Chunk]


class AgentResponse(BaseModel):
    query: str
    action: Literal["answer", "escalate"]
    answer: str | None
    citations: list[str]
    retrieval_trace: RetrievalTrace
    guardrail_trace: GuardrailTrace
    escalation_reason: str | None = None
