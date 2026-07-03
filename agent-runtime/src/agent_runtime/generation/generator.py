import os

from google import genai
from google.genai import types
from pydantic import BaseModel

from agent_runtime.models import Chunk

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

SYSTEM_PROMPT = (
    "You are a customer support agent. Answer the user's question using ONLY "
    "the provided context chunks below — every claim in your answer must be "
    "grounded in that context. If the context does not contain enough "
    "information to answer, set answer to \"I don't know based on the "
    "available information.\" and citations to an empty list; do not guess "
    "or use outside knowledge. Cite the id of every chunk you drew on."
)


class GenerationResult(BaseModel):
    answer: str
    citations: list[str]


def build_context_block(chunks: list[Chunk]) -> str:
    return "\n\n".join(f"[{c.id}] {c.text}" for c in chunks)


def generate(query: str, chunks: list[Chunk], client=None) -> GenerationResult:
    client = client or _default_client()
    context = build_context_block(chunks)
    prompt = f"Context:\n{context}\n\nQuestion: {query}"

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=GenerationResult,
        ),
    )
    return GenerationResult.model_validate_json(response.text)


def _default_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set. Add it to .env.")
    return genai.Client(api_key=api_key)
