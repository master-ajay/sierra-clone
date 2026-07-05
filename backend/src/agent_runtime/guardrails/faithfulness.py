import os

from openai import OpenAI
from pydantic import BaseModel

from agent_runtime.generation.generator import build_context_block
from agent_runtime.models import Chunk, GuardrailTrace

MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

JUDGE_PROMPT = (
    "You are a strict fact-checker. Given context chunks and a generated "
    "answer, determine what fraction of the answer's claims are directly "
    "supported by the context. Respond with JSON in this format: "
    '{"score": 0.0} where score is from 0.0 (unsupported or fabricated) '
    "to 1.0 (fully supported by the context)."
)


class FaithfulnessScore(BaseModel):
    score: float


def check_faithfulness(
    answer: str,
    chunks: list[Chunk],
    threshold: float = 0.7,
    client=None,
) -> GuardrailTrace:
    client = client or _default_client()
    context = build_context_block(chunks)
    prompt = f"Context:\n{context}\n\nAnswer to check: {answer}"

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": JUDGE_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    result = FaithfulnessScore.model_validate_json(response.choices[0].message.content)
    return GuardrailTrace(
        faithfulness_score=result.score,
        threshold=threshold,
        passed=result.score >= threshold,
    )


def _default_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set. Add it to .env.")
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
