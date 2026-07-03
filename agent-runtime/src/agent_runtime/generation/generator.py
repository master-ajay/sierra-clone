import os

from openai import OpenAI
from pydantic import BaseModel

from agent_runtime.models import Chunk

MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

SYSTEM_PROMPT = (
    "You are a customer support agent. Answer the user's question using ONLY "
    "the provided context chunks below — every claim in your answer must be "
    "grounded in that context. If the context does not contain enough "
    "information to answer, set answer to \"I don't know based on the "
    "available information.\" and citations to an empty list; do not guess "
    "or use outside knowledge. Cite the id of every chunk you drew on. "
    'Respond with JSON in this exact format: {"answer": "...", "citations": ["..."]}'
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

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    return GenerationResult.model_validate_json(response.choices[0].message.content)


def _default_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set. Add it to .env.")
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
