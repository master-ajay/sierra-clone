# Agent Runtime & SDK — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-agent-runtime-design.md`
Location: `agent-runtime/` subdirectory of this repo (separate Python
project, own `.venv`, own `pyproject.toml`/`requirements.txt` — does not
touch the Next.js Agent Studio app at the repo root).

Follows the milestone order from spec Section 11 (M1–M6). Each milestone is
a Task below: implement via TDD, run `pytest`, `ruff check`, self-review,
commit, then move to the next milestone. No human-review gate (see root
`CLAUDE.md`).

## Status

- [x] Task 0: Scaffold + deps installed. `.venv` created, `pip install -r requirements.txt` + `pip install -e .` done, `pytest --collect-only` clean.
- [x] Task 1 / M1: Ingestion pipeline — done (commit d3f28a3). `loader.py`, `indexer.py`, sample KB under `agent-runtime/docs/` (shipping.md, returns.md, account.md). 4/4 tests passing, ruff clean.
- [ ] Task 2 / M2: Retrieval + fusion — `retrieval/vector_search.py`, `retrieval/bm25_search.py`, `retrieval/fusion.py` (RRF). Test: `tests/test_retrieval.py`. Done when: a test confirms fusion re-ranks correctly on a known example (a doc that ranks low in vector search but high in BM25 surfaces in fused results).
- [ ] Task 3 / M3: Generation with citations — `generation/generator.py`, wired to Gemini via `google-genai` (`GEMINI_API_KEY` from `.env` — not available in this environment yet, will need the user to supply it, same pattern as `GROQ_API_KEY` for Agent Studio). Test: `tests/test_generation.py`. Done when: a test query against the sample KB returns an answer with >=1 valid citation ID (mock the LLM call in tests; live-key verification is a manual step like Agent Studio's Task 12).
- [ ] Task 4 / M4: Guardrail / faithfulness check — `guardrails/faithfulness.py`, LLM-as-judge scoring 0-1 against a configurable threshold (default 0.7). Test: `tests/test_guardrails.py`. Done when: a deliberately hallucinated test response scores below threshold and triggers escalation; a well-grounded response passes.
- [ ] Task 5 / M5: Agent orchestration (SDK) — `agent.py`, wires M1-M4 into the linear pipeline from spec Section 6, `models.py` (Pydantic schemas from spec Section 8: `Chunk`, `RetrievalTrace`, `GuardrailTrace`, `AgentResponse`). Test: `tests/test_agent_e2e.py`. Done when: `agent.query(...)` returns a full `AgentResponse` including trace, for both an answerable and an unanswerable test question.
- [ ] Task 6 / M6: REST + streaming API — `api.py` (FastAPI: `POST /v1/query`, `POST /v1/query/stream` SSE, `POST /v1/knowledge-base/ingest`). Done when: both query endpoints work end-to-end against a running server, verified with an httpx/curl test.
- [ ] Task 7: Manual end-to-end verification against acceptance criteria (spec Section 12) — needs a real `GEMINI_API_KEY`.

## Resume instructions if interrupted

1. Check this file's Status section and `.superpowers/sdd/progress.md` (agent-runtime section) for the last completed task.
2. `cd agent-runtime && source .venv/bin/activate` (create the venv first per Task 0 if it doesn't exist yet).
3. Run `pytest` to confirm the last completed task's tests still pass before starting the next one.
4. Continue at the first unchecked task above.
