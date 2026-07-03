import os

from google import genai
from google.genai import types
from pydantic import BaseModel

from agent_runtime.generation.generator import build_context_block
from agent_runtime.models import Chunk, GuardrailTrace

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

JUDGE_PROMPT = (
    "You are a strict fact-checker. Given context chunks and a generated "
    "answer, determine what fraction of the answer's claims are directly "
    "supported by the context. Respond with a faithfulness score from 0.0 "
    "(unsupported or fabricated) to 1.0 (fully supported by the context)."
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

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=JUDGE_PROMPT,
            response_mime_type="application/json",
            response_schema=FaithfulnessScore,
        ),
    )
    result = FaithfulnessScore.model_validate_json(response.text)
    return GuardrailTrace(
        faithfulness_score=result.score,
        threshold=threshold,
        passed=result.score >= threshold,
    )


def _default_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set. Add it to .env.")
    return genai.Client(api_key=api_key)
