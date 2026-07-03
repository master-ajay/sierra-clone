import json
import os

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from agent_runtime.agent import Agent
from agent_runtime.models import AgentResponse

app = FastAPI(title="Agent Runtime")


@app.exception_handler(RuntimeError)
def runtime_error_handler(request: Request, exc: RuntimeError) -> JSONResponse:
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
