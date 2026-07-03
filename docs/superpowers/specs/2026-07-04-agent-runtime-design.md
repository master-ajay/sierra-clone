# Product Spec: Agent Runtime & SDK (v1)

**Author:** Product
**Audience:** Engineering (Claude Code implementation)
**Status:** Ready for build
**Scope:** This is Product #1 of 8 in the platform roadmap. It is the core engine every other product (Agent Studio, Ghostwriter, ADP, Voice) will be built on top of. Nothing else gets built until this exists and works standalone via API/SDK.

---

## 1. Problem Statement

We need a runtime that can take a user message, decide what to do about it (answer from knowledge, call a tool, escalate to a human), and return a grounded, safe response — callable both as a Python SDK and as a REST/streaming API. Today we have no engine. This spec defines the smallest version of that engine that is genuinely useful standalone, without any of the no-code UI, memory persistence, or voice layers that come later.

## 2. Goals (v1)

- A single support agent can answer questions grounded in a provided knowledge base, with citations.
- Every response passes through a confidence check before being returned; low-confidence responses escalate instead of guessing.
- The engine is callable three ways: Python function call, REST endpoint, and streaming (SSE) endpoint.
- The full decision trace (what was retrieved, what confidence score, which path taken) is returned alongside every response — this is a core product differentiator, not an afterthought.

## 3. Non-Goals (explicitly out of scope for v1)

- No persistent cross-conversation memory (that's the ADP product, built later on top of this).
- No no-code UI (that's Agent Studio).
- No voice/telephony.
- No multi-tenant auth/billing — single API key is fine for v1.
- No multi-LLM routing — one model provider, one model, hardcoded for now.
- No PII scrubbing yet (flag this as a fast-follow, not a v1 blocker, but leave a clear extension point in the guardrail step).

## 4. Users

- **Internal (v1 consumer):** our own team, integrating this engine into the next product (Agent Studio).
- **External (future):** developers using the Agent SDK directly, once this is stable enough to expose.

v1 does not need to be polished for external developers yet — it needs to be **correct and well-structured**, because everything else gets built on top of it.

## 5. Functional Requirements

### 5.1 Ingestion
- Accept a folder of documents (`.txt`, `.md`, `.pdf`) as the knowledge base.
- Chunk documents into passages (target ~300–500 tokens per chunk, with overlap).
- Index chunks into a vector store and a keyword (BM25) index.

### 5.2 Retrieval
- Given a user query, retrieve candidates from both the vector index and BM25 index in parallel.
- Fuse the two ranked lists using Reciprocal Rank Fusion (RRF).
- Return the top N (default 5) fused results as context for generation.

### 5.3 Generation
- Given the user query + retrieved context, generate a response using the LLM.
- The response must cite which retrieved chunk(s) it drew from.
- The system prompt must instruct the model to say "I don't know" / escalate rather than answer outside the provided context.

### 5.4 Confidence / Guardrail Check
- After generation, run a faithfulness check: does the response's claims actually appear in the retrieved context?
- If faithfulness score is below a configurable threshold (default 0.7), do not return the generated answer — return an escalation response instead.
- This check must be a distinct, callable step (not inline string matching) so it can be swapped out or improved later without touching the rest of the pipeline.

### 5.5 Escalation
- When confidence is too low, or the model explicitly says it doesn't know, return a structured "escalate" response rather than forcing an answer.
- v1 escalation is just a structured output (`{"action": "escalate", "reason": "..."}`) — no actual ticketing system integration yet.

### 5.6 Trace / Explainability
- Every call returns not just the final answer, but a full trace object: retrieved chunks (with scores), the fusion step, the raw generated response, the faithfulness score, and the final decision (answer vs. escalate).
- This trace is a first-class part of the response schema, not a debug log.

## 6. Technical Architecture

```
User Query
   │
   ▼
[Retrieval Layer]
   ├── Vector search (top-k)
   ├── BM25 search (top-k)
   └── RRF fusion → top N chunks
   │
   ▼
[Generation Layer]
   └── LLM call with query + context → draft response + citations
   │
   ▼
[Guardrail Layer]
   └── Faithfulness check against retrieved context
   │
   ▼
[Decision]
   ├── Pass  → return answer + trace
   └── Fail  → return escalation + trace
```

Each layer is a separate, independently testable module. The orchestration between them is a simple linear pipeline for v1 — **no LangGraph state machine yet**. Introduce LangGraph in v1.1 once there's a real need for branching/looping (e.g., tool calls, multi-turn clarification). Don't add orchestration complexity before it's needed.

## 7. Tech Stack

- **Language:** Python 3.11+
- **LLM:** Gemini via `google-genai` SDK (single model, no fallback logic yet — hardcode `gemini-2.0-flash` or latest stable equivalent)
- **Vector store:** ChromaDB (local, dev-friendly)
- **Keyword search:** `rank-bm25`
- **API framework:** FastAPI + Uvicorn
- **Streaming:** Server-Sent Events (SSE)
- **Data validation:** Pydantic v2 for all request/response schemas
- **Testing:** pytest

## 8. Data Models (Pydantic)

```python
class Chunk(BaseModel):
    id: str
    text: str
    source: str          # filename this chunk came from
    score: float          # retrieval score

class RetrievalTrace(BaseModel):
    vector_results: list[Chunk]
    bm25_results: list[Chunk]
    fused_results: list[Chunk]   # after RRF

class GuardrailTrace(BaseModel):
    faithfulness_score: float
    threshold: float
    passed: bool

class AgentResponse(BaseModel):
    query: str
    action: Literal["answer", "escalate"]
    answer: str | None
    citations: list[str]          # chunk ids cited
    retrieval_trace: RetrievalTrace
    guardrail_trace: GuardrailTrace
    escalation_reason: str | None
```

## 9. API Surface

### 9.1 Python SDK
```python
from agent_runtime import Agent

agent = Agent(knowledge_base_path="./docs")
response: AgentResponse = agent.query("How do I reset my password?")
```

### 9.2 REST
```
POST /v1/query
Body: {"query": "How do I reset my password?"}
Response: AgentResponse (JSON)
```

### 9.3 Streaming
```
POST /v1/query/stream
Body: {"query": "..."}
Response: SSE stream — token deltas during generation, then a final
          event containing the full AgentResponse (with trace).
```

### 9.4 Ingestion
```
POST /v1/knowledge-base/ingest
Body: {"path": "./docs"}   (v1: local path only, no file upload yet)
Response: {"chunks_indexed": <int>}
```

## 10. Repo Structure

```
agent-runtime/
├── src/
│   ├── ingestion/
│   │   ├── loader.py        # load & chunk documents
│   │   └── indexer.py       # write to vector store + BM25 index
│   ├── retrieval/
│   │   ├── vector_search.py
│   │   ├── bm25_search.py
│   │   └── fusion.py        # RRF
│   ├── generation/
│   │   └── generator.py     # LLM call + citation extraction
│   ├── guardrails/
│   │   └── faithfulness.py  # confidence check
│   ├── agent.py              # orchestrates the pipeline (the SDK entry point)
│   ├── api.py                 # FastAPI app (REST + SSE)
│   └── models.py              # Pydantic schemas
├── tests/
│   ├── test_retrieval.py
│   ├── test_generation.py
│   ├── test_guardrails.py
│   └── test_agent_e2e.py
├── docs/                        # sample knowledge base for local dev/testing
├── .env.example
├── requirements.txt
└── README.md
```

## 11. Milestones (build in this order)

**M1 — Ingestion pipeline**
Load documents from a folder, chunk them, index into ChromaDB and BM25.
*Done when:* running ingestion on a sample docs folder produces a queryable index; a unit test confirms chunk count and retrievability of a known passage.

**M2 — Retrieval + fusion**
Implement vector search, BM25 search, and RRF fusion as independent, testable functions.
*Done when:* given a query, all three functions return ranked results; a test confirms fusion re-ranks correctly on a known example (a doc that ranks low in vector search but high in BM25 should surface in fused results).

**M3 — Generation with citations**
Wire retrieved chunks into an LLM call; extract which chunks the response actually cites.
*Done when:* a test query against the sample knowledge base returns an answer with at least one valid citation ID.

**M4 — Guardrail / faithfulness check**
Implement the confidence check as an isolated module. Start simple (e.g., LLM-as-judge scoring faithfulness 0–1) rather than a complex custom metric.
*Done when:* a deliberately hallucinated test response scores below threshold and triggers escalation; a well-grounded response passes.

**M5 — Agent orchestration (SDK)**
Wire M1–M4 into the `Agent` class with the linear pipeline described in Section 6.
*Done when:* `agent.query(...)` returns a full `AgentResponse` including trace, for both an answerable and an unanswerable test question.

**M6 — REST + streaming API**
Wrap the `Agent` class in FastAPI, including the SSE streaming endpoint.
*Done when:* `POST /v1/query` and `POST /v1/query/stream` both work end-to-end against a running server, verified with a simple curl/httpx test.

## 12. Acceptance Criteria (v1 overall)

- [ ] Ingesting the sample knowledge base and querying it returns correct, cited answers for in-scope questions.
- [ ] Out-of-scope questions (not covered by the knowledge base) trigger escalation, not a hallucinated answer.
- [ ] Every response includes a full trace object — retrieval scores, fusion result, faithfulness score.
- [ ] All three access patterns (SDK, REST, streaming) work and return the same underlying `AgentResponse` shape.
- [ ] Test suite covers each module in Section 11 independently, plus one end-to-end test.

## 13. Environment / Config

```
GEMINI_API_KEY=
VECTOR_DB_PATH=./chroma_data
FAITHFULNESS_THRESHOLD=0.7
TOP_K_RETRIEVAL=5
```

## 14. Open Questions (flag, don't block on)

- Which faithfulness-scoring approach to standardize on long-term (LLM-as-judge vs. a dedicated NLI model) — start with LLM-as-judge for v1, revisit if it's too slow/expensive at scale.
- Chunk size/overlap defaults may need tuning once we have a real knowledge base rather than the sample docs — don't over-optimize this in v1.
