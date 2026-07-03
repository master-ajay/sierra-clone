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
- [x] Task 2 / M2: Retrieval + fusion — done (commit c760266). `vector_search.py`, `bm25_search.py`, `fusion.py` (RRF). 8/8 tests passing, ruff clean.
- [x] Task 3 / M3: Generation with citations — done (this commit). `generator.py` uses Gemini structured output (`response_schema=GenerationResult`) so citations come back as a typed list rather than parsed from free text. Tests mock the client. 3/3 tests passing, ruff clean. Live-key verification still pending (needs GEMINI_API_KEY, deferred to Task 7).
- [x] Task 4 / M4: Guardrail / faithfulness check — done (this commit). `guardrails/faithfulness.py`, LLM-as-judge via Gemini structured output, returns `GuardrailTrace` (now in models.py). 3/3 tests passing, ruff clean.
- [x] Task 5 / M5: Agent orchestration (SDK) — done (this commit). `agent.py` (`Agent` class, exported from package root so `from agent_runtime import Agent` works per spec 9.1), wires retrieval+fusion -> generation -> guardrail into the linear pipeline. `models.py` now has all 4 schemas (`Chunk`, `GuardrailTrace`, `RetrievalTrace`, `AgentResponse`). 16/16 tests passing, ruff clean.
- [x] Task 6 / M6: REST + streaming API — done (this commit). `api.py` (FastAPI: `POST /v1/query`, `POST /v1/query/stream` SSE with word-chunked reveal + final `AgentResponse`, `POST /v1/knowledge-base/ingest`), `get_agent()` FastAPI dependency for test injection. Added a `RuntimeError` exception handler (both JSON 500 and SSE `error` event) after finding the missing-GEMINI_API_KEY case leaked a raw stack trace when verified against a real running uvicorn server. 21/21 tests passing, ruff clean. Verified against a real running server via curl (ingest, query error path, stream error path); real generation/guardrail path not verified — no GEMINI_API_KEY.
- [ ] Task 7: Manual end-to-end verification against acceptance criteria (spec Section 12) — needs a real `GEMINI_API_KEY`.

## Resume instructions if interrupted

1. Check this file's Status section and `.superpowers/sdd/progress.md` (agent-runtime section) for the last completed task.
2. `cd agent-runtime && source .venv/bin/activate` (create the venv first per Task 0 if it doesn't exist yet).
3. Run `pytest` to confirm the last completed task's tests still pass before starting the next one.
4. Continue at the first unchecked task above.
