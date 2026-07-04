import json
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from agent_runtime.api import app, get_agent
from agent_runtime.ingestion.indexer import IndexResult
from agent_runtime.models import AgentResponse, GuardrailTrace, RetrievalTrace


def _sample_response(action="answer", answer="Hi", escalation_reason=None):
    trace = RetrievalTrace(vector_results=[], bm25_results=[], fused_results=[])
    guard = GuardrailTrace(faithfulness_score=0.9, threshold=0.7, passed=(action == "answer"))
    return AgentResponse(
        query="q",
        action=action,
        answer=answer,
        citations=[],
        retrieval_trace=trace,
        guardrail_trace=guard,
        escalation_reason=escalation_reason,
    )


def _mock_agent(response: AgentResponse, ingest_result: IndexResult | None = None):
    agent = MagicMock()
    agent.query.return_value = response
    agent.ingest.return_value = ingest_result or IndexResult(chunks_indexed=3)
    return agent


def test_query_endpoint_returns_agent_response_json():
    app.dependency_overrides[get_agent] = lambda: _mock_agent(_sample_response())
    client = TestClient(app)

    res = client.post("/v1/query", json={"query": "hi"})

    assert res.status_code == 200
    body = res.json()
    assert body["answer"] == "Hi"
    assert body["action"] == "answer"
    app.dependency_overrides.clear()


def test_ingest_endpoint_returns_chunks_indexed():
    app.dependency_overrides[get_agent] = lambda: _mock_agent(
        _sample_response(), IndexResult(chunks_indexed=7)
    )
    client = TestClient(app)

    res = client.post("/v1/knowledge-base/ingest", json={"path": "./docs"})

    assert res.status_code == 200
    assert res.json() == {"chunks_indexed": 7}
    app.dependency_overrides.clear()


def test_query_stream_endpoint_emits_content_then_done_event():
    app.dependency_overrides[get_agent] = lambda: _mock_agent(
        _sample_response(answer="Ships in two days")
    )
    client = TestClient(app)

    with client.stream("POST", "/v1/query/stream", json={"query": "hi"}) as res:
        body = "".join(res.iter_text())

    events = [json.loads(line[len("data: ") :]) for line in body.split("\n\n") if line.startswith("data: ")]

    assert any(e["type"] == "content" for e in events)
    assert events[-1]["type"] == "done"
    assert events[-1]["response"]["answer"] == "Ships in two days"
    app.dependency_overrides.clear()


def test_delete_source_endpoint_returns_deleted_count():
    agent = MagicMock()
    agent.persist_path = "/tmp/test-vector-db"
    import agent_runtime.api as api_module
    original = api_module.delete_by_source
    api_module.delete_by_source = MagicMock(return_value=3)
    app.dependency_overrides[get_agent] = lambda: agent
    client = TestClient(app)

    res = client.delete("/v1/knowledge-base/source/my-article-123")

    assert res.status_code == 200
    assert res.json() == {"deleted": 3}
    app.dependency_overrides.clear()
    api_module.delete_by_source = original


def test_query_endpoint_returns_clean_json_error_on_runtime_error():
    agent = MagicMock()
    agent.query.side_effect = RuntimeError("GROQ_API_KEY is not set. Add it to .env.")
    app.dependency_overrides[get_agent] = lambda: agent
    client = TestClient(app)

    res = client.post("/v1/query", json={"query": "hi"})

    assert res.status_code == 500
    assert res.json() == {"error": {"code": "runtime_error", "message": "GROQ_API_KEY is not set. Add it to .env.", "details": {}}}
    app.dependency_overrides.clear()


def test_query_stream_endpoint_emits_error_event_on_runtime_error():
    agent = MagicMock()
    agent.query.side_effect = RuntimeError("GROQ_API_KEY is not set. Add it to .env.")
    app.dependency_overrides[get_agent] = lambda: agent
    client = TestClient(app)

    with client.stream("POST", "/v1/query/stream", json={"query": "hi"}) as res:
        body = "".join(res.iter_text())

    events = [json.loads(line[len("data: ") :]) for line in body.split("\n\n") if line.startswith("data: ")]

    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert events[0]["code"] == "runtime_error"
    assert "GROQ_API_KEY" in events[0]["message"]
    app.dependency_overrides.clear()
