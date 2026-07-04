import json
import logging
import os

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from agent_runtime.agent import Agent
from agent_runtime.ingestion.indexer import upsert_chunks
from agent_runtime.ingestion.loader import chunk_text
from agent_runtime.models import AgentResponse, Chunk

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Runtime")


@app.exception_handler(RuntimeError)
def runtime_error_handler(request: Request, exc: RuntimeError) -> JSONResponse:
    logger.error("runtime_error path=%s error=%s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "runtime_error", "message": str(exc), "details": {}}},
    )


def create_agent() -> Agent:
    return Agent(
        persist_path=os.environ.get("VECTOR_DB_PATH", "./chroma_data"),
        top_k=int(os.environ.get("TOP_K_RETRIEVAL", "5")),
        faithfulness_threshold=float(os.environ.get("FAITHFULNESS_THRESHOLD", "0.7")),
    )


_agent = create_agent()


def get_agent() -> Agent:
    return _agent


def _default_llm_client():
    from openai import OpenAI
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set.")
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")


class QueryRequest(BaseModel):
    query: str


class IngestRequest(BaseModel):
    path: str


@app.post("/v1/query", response_model=AgentResponse)
def query(body: QueryRequest, agent: Agent = Depends(get_agent)) -> AgentResponse:
    return agent.query(body.query)


@app.post("/v1/query/stream")
def query_stream(body: QueryRequest, agent: Agent = Depends(get_agent)) -> StreamingResponse:
    def event_stream():
        try:
            response = agent.query(body.query)
        except RuntimeError as exc:
            yield f"data: {json.dumps({'type': 'error', 'code': 'runtime_error', 'message': str(exc)})}\n\n"
            return

        text = response.answer or response.escalation_reason or ""
        for word in text.split():
            yield f"data: {json.dumps({'type': 'content', 'delta': word + ' '})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'response': response.model_dump()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/v1/knowledge-base/ingest")
def ingest(body: IngestRequest, agent: Agent = Depends(get_agent)) -> dict:
    result = agent.ingest(body.path)
    return {"chunks_indexed": result.chunks_indexed}


# --- Compatibility endpoints consumed by downstream products ---

class ProductQueryRequest(BaseModel):
    question: str
    history: list[dict] = []
    context_messages: list[dict] = []
    mode: str = "rag"  # "rag" (default, with RAG + faithfulness) or "generate" (direct LLM, no RAG)


class IngestDocumentItem(BaseModel):
    content: str
    source: str


class ProductIngestRequest(BaseModel):
    documents: list[IngestDocumentItem]


@app.post("/query")
def product_query(body: ProductQueryRequest, agent: Agent = Depends(get_agent)) -> dict:
    """Compatibility endpoint for downstream products (Channels, Voice, Expert Answers).

    mode="rag"      → full RAG + faithfulness guardrail (default, for customer Q&A)
    mode="generate" → direct LLM call bypassing RAG (for article/content generation)
    """
    if body.mode == "generate":
        # Direct LLM call — bypass RAG and faithfulness guardrail.
        # Return the raw text response as 'answer' so callers can parse it themselves.
        client = agent.client or _default_llm_client()
        from agent_runtime.generation.generator import MODEL
        _generation_system = (
            "You are a helpful AI assistant. Follow the user's instructions exactly. "
            "When asked to respond in JSON, respond only with valid JSON and no additional text."
        )
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": _generation_system},
                {"role": "user", "content": body.question},
            ],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or ""
        return {"answer": raw, "citations": [], "trace": {}, "action": "answer"}

    result = agent.query(body.question)
    return {
        "answer": result.answer,
        "citations": result.citations,
        "trace": result.retrieval_trace.model_dump() if result.retrieval_trace else {},
        "action": result.action,
        "escalation_reason": result.escalation_reason,
    }


@app.post("/ingest")
def product_ingest(body: ProductIngestRequest, agent: Agent = Depends(get_agent)) -> dict:
    """Compatibility endpoint for Ghostwriter: ingest raw document content without clearing the index."""
    persist_path = agent.persist_path
    chunks: list[Chunk] = []
    for doc in body.documents:
        for i, piece in enumerate(chunk_text(doc.content)):
            chunks.append(Chunk(id=f"{doc.source}::{i}", text=piece, source=doc.source))
    result = upsert_chunks(chunks, persist_path)
    return {"chunks_indexed": result.chunks_indexed}
