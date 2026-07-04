# Product Spec: Unified Backend Process — All 6 Python Backends

Spec date: 2026-07-05
Status: Awaiting Gate 1
Depends on: none. Mirrors the pattern established by
`2026-07-05-platform-shell-design.md` (frontend consolidation), applied to
the Python backends.

Revision note: an earlier draft of this spec scoped a pilot-only migration
(ADP alone, others deferred). Per explicit user direction this revision
covers all 6 Python backends in one spec — the phasing now lives in the
*implementation plan* (still done one backend at a time, for safety), not
in the spec's scope.

---

## 1. Problem Statement

Every Python backend in this repo runs as its own FastAPI process, on its
own port, with its own venv, own SQLite file, and independently-drifting
dependency pins: agent-runtime (8001), agent-data-platform/ADP (8100),
channels (8200), trust (8500), expert-answers (8600), voice (8700).
Three of these (channels, voice, expert-answers) also hardcode HTTP URLs to
call the other three (ADP, agent-runtime, trust) at their standalone ports
— today's "integration" is six independent processes calling each other
over localhost.

This spec defines what "consolidate the Python backend" means: one FastAPI
process, one port, every product mounted as an independent sub-application,
talking to each other through that same process instead of six separate
ports. It also takes a real step toward a shared database for the four
SQL-backed products (ADP, trust, expert-answers, channels, voice — five,
not four; agent-runtime uses a vector store, not SQL, and is handled
differently, see FR-4).

---

## 2. Goals (v1)

- G1: A single running FastAPI process (`backend/`, port 8000) hosting all
  6 products as mounted sub-applications: `/runtime`, `/adp`, `/channels`,
  `/trust`, `/expert-answers`, `/voice`.
- G2: Each product's routes, services, and data layer run inside
  `backend/`, functionally identical to today's standalone versions.
- G3: The five SQL-backed products' tables move into one shared SQLite
  file (`backend/data/platform.db`), each product's tables renamed with a
  product prefix (`adp_*`, `trust_*`, `expert_answers_*`, `channels_*`,
  `voice_*`) to avoid collisions — both today's one real collision
  (ADP's bare `users`/`sessions`/`messages`) and future ones as the file
  accumulates more products' tables.
- G4: agent-runtime's ChromaDB + BM25 vector-store data moves to
  `backend/data/chroma/` — co-located under the same `backend/data/`
  directory as the shared SQLite file, but not part of it (a vector store
  isn't a SQL schema; see FR-4).
- G5: Channels', Voice's, and Expert Answers' inter-service HTTP calls
  (today pointed at `:8100`/`:8001`/`:8500`) are repointed, in their
  `backend/`-mounted copies only, to the unified base
  (`http://localhost:8000/adp`, `/runtime`, `/trust`) — the mounted copies
  actually talk to each other through the one process, not through the
  old standalone ports.
- G6: Dependency versions are reconciled into one `backend/requirements.txt`
  that satisfies all 6 products, including bumping expert-answers' pinned
  versions (`fastapi==0.111.0` → `>=0.115.0`, `pydantic==2.7.4` → `>=2.8.0`,
  etc.) to match the range already used by four of the other five.
- G7: All 6 existing standalone processes keep running unmodified and
  undeleted through this spec — retiring any of them is a follow-up
  decision, not part of this work.

---

## 3. Non-Goals

- No retiring/deleting any of the 6 standalone apps.
- No auth/API-key unification — each product keeps its own `*_api_key`
  setting and its own auth dependency, scoped to its own mount prefix.
- No cross-product schema design beyond the table-prefixing in G3 — no
  product shares a genuine data entity with another today (ADP's users
  aren't Trust's audit-log actors aren't Voice's callers), so no shared
  table is introduced.
- No changing any product's external API contract (route paths under its
  own prefix, request/response shapes) — only *where* each product runs
  and *what it's called* by its siblings changes, not what it does.
- No load balancing, process supervision beyond what already exists
  (`scripts/dev-up.sh`/`dev-down.sh`), or production deployment concerns.

---

## 4. Functional Requirements

### FR-1: Backend process scaffold

- FR-1.1 New standalone Python project `backend/` (own `pyproject.toml`,
  own `.venv`, own `requirements.txt`) — a sibling to the other Python
  projects (`agent-runtime/`, `agent-data-platform/`, etc.), not an npm
  workspace member.
- FR-1.2 `backend/src/backend/main.py` defines one root `FastAPI` app.
  Every product's existing `FastAPI` app object is mounted via Starlette's
  native sub-app mounting — `app.mount("/adp", adp_app)`,
  `app.mount("/trust", trust_app)`, `app.mount("/channels", channels_app)`,
  `app.mount("/expert-answers", expert_answers_app)`,
  `app.mount("/voice", voice_app)`, `app.mount("/runtime", runtime_app)` —
  which preserves each product's own lifespan hook, exception handlers,
  and middleware without re-registering any of them on the parent.
- FR-1.3 `backend/` runs on port 8000 — the one unclaimed port in the
  platform's numbering.
- FR-1.4 Root health check: `GET /health` on the parent app returns
  `{"status": "ok"}`, independent of any mounted sub-app — proves the
  parent process itself is up even if a sub-app's own dependencies are
  down. Each product's own health stays at `/<prefix>/v1/health`
  (`/runtime` has no existing health endpoint — see FR-4.3).

### FR-2: Dependency reconciliation

- FR-2.1 One `backend/requirements.txt` covering the union of all 6
  products' dependencies at versions that satisfy every one of them:
  `fastapi>=0.115.0`, `uvicorn[standard]>=0.30.0`, `pydantic>=2.8.0`,
  `pydantic-settings>=2.4.0`, `httpx>=0.27.0`, `respx>=0.21.0`,
  `pytest>=8.3.0`, `pytest-asyncio>=0.23.0`, `ruff>=0.8.0` (the shared
  FastAPI-stack floor already used by trust/channels/ADP), plus
  agent-runtime's extra dependencies unaffected by this floor:
  `openai>=1.0.0`, `chromadb>=0.5.0`, `rank-bm25>=0.2.2`, `pypdf>=4.3.0`.
- FR-2.2 Expert-answers' copied source is verified to still pass its own
  test suite under the bumped versions (`fastapi>=0.115.0` instead of
  `==0.111.0`, `pydantic>=2.8.0` instead of `==2.7.4`) — this is the one
  product where the version floor is a real change, not just a
  restatement of what it already required.
- FR-2.3 The 6 standalone apps' own `requirements.txt`/`pyproject.toml`
  files are untouched — the version bump applies only inside `backend/`'s
  copy of expert-answers.

### FR-3: Shared SQLite database (5 SQL-backed products)

- FR-3.1 One SQLite file, `backend/data/platform.db`, replacing the 5
  separate files (`adp.db`, `trust.db`, `expert_answers.db`,
  `channels.db`, `voice.db`) for the code now living in `backend/`.
- FR-3.2 Every SQL-backed product's migration SQL and every query site
  referencing its own bare table names are updated to the product-prefixed
  names:
  - ADP: `users`→`adp_users`, `sessions`→`adp_sessions`,
    `messages`→`adp_messages` (query sites: `database.py`,
    `routes/system.py`'s `stats`, every file under `services/`).
  - Trust: `audit_log`→`trust_audit_log`.
  - Expert Answers: `resolutions`→`expert_answers_resolutions`,
    `knowledge_articles`→`expert_answers_knowledge_articles`.
  - Channels: `channels`→`channels_channels`,
    `channel_stats`→`channels_channel_stats`.
  - Voice: `lines`→`voice_lines`, `calls`→`voice_calls`,
    `payment_attempts`→`voice_payment_attempts`.
  Foreign key references inside each product's migration SQL are updated
  to match its own renamed tables (no cross-product foreign keys are
  introduced).
- FR-3.3 Each product's `*_db_path` setting (`adp_db_path`,
  `trust_db_path`, `expert_answers_db_path`, `channels_db_path`,
  `voice_db_path`) is set to `backend/data/platform.db` in its
  `backend/`-mounted copy — reusing each product's existing config
  mechanism (`pydantic-settings` field), not a new setting.
- FR-3.4 All 5 products' `run_migrations()` calls (invoked from each
  product's own lifespan hook, unchanged) run against the same file at
  parent-app startup — each migration script only creates its own
  prefixed tables (`CREATE TABLE IF NOT EXISTS`), so running all 5 against
  one file is additive, not conflicting.

### FR-4: agent-runtime (vector store, not SQL)

- FR-4.1 agent-runtime's `src/agent_runtime/` package is copied into
  `backend/src/agent_runtime/` unchanged, mounted at `/runtime` via
  `app.mount("/runtime", runtime_app)` where `runtime_app` is `api.py`'s
  existing module-level `app` object.
- FR-4.2 Its ChromaDB + pickled BM25 persistence directory
  (`VECTOR_DB_PATH` env var, defaulting to `./chroma_data`) is set to
  `backend/data/chroma` for the `backend/`-mounted copy — co-located under
  `backend/data/` alongside `platform.db`, but a separate directory, not a
  table inside it (a vector store's on-disk format isn't SQL).
- FR-4.3 agent-runtime's `api.py` has no `/v1/health` endpoint today
  (unlike the other 5 products) — one is added,
  `GET /runtime/v1/health` returning `{"status": "ok"}`, for parity with
  the other 5 mounted products' health checks. This is a small, additive
  change to the copied `backend/` version only; the standalone
  `agent-runtime/` app is untouched.

### FR-5: Inter-service URL repointing

- FR-5.1 In `backend/`'s copies only, the following settings are changed
  from their standalone defaults to the unified base:
  - Channels: `channels_adp_url` → `http://localhost:8000/adp`,
    `channels_runtime_url` → `http://localhost:8000/runtime`,
    `channels_trust_url` → `http://localhost:8000/trust`.
  - Voice: `voice_adp_url` → `http://localhost:8000/adp`,
    `voice_runtime_url` → `http://localhost:8000/runtime`,
    `voice_trust_url` → `http://localhost:8000/trust`.
  - Expert Answers: `expert_answers_adp_url` → `http://localhost:8000/adp`,
    `expert_answers_runtime_url` → `http://localhost:8000/runtime`,
    `expert_answers_trust_url` → `http://localhost:8000/trust`.
- FR-5.2 The corresponding `*_api_key` settings for these cross-service
  calls (e.g. `channels_adp_api_key`) are unchanged — each mounted
  product's own auth dependency still expects the same key value it does
  today; only the URL changes, not the credential.
- FR-5.3 The 6 standalone apps' own settings (env vars / `.env` files)
  are untouched — they keep calling each other at the old standalone
  ports, exactly as today.

---

## 5. Technical Architecture

```
backend/                              (new, port 8000)
  src/backend/main.py                 → root FastAPI app, GET /health,
                                         mounts all 6 sub-apps
  src/agent_runtime/                  → copied, /runtime, vector store
                                         at data/chroma (FR-4)
  src/adp/                            → copied, /adp, tables prefixed adp_*
  src/channels/                       → copied, /channels, tables prefixed
                                         channels_*
  src/trust/                          → copied, /trust, tables prefixed
                                         trust_*
  src/expert_answers/                 → copied, /expert-answers, tables
                                         prefixed expert_answers_*,
                                         dependency versions bumped (FR-2.2)
  src/voice/                          → copied, /voice, tables prefixed
                                         voice_*
  data/
    platform.db                       → shared SQLite (5 SQL-backed
                                         products' prefixed tables)
    chroma/                           → agent-runtime's vector store
  tests/
    adp/, channels/, trust/,
    expert_answers/, voice/,
    agent_runtime/                    → each product's test suite, ported

agent-runtime/ (8001), agent-data-platform/ (8100), channels/ (8200),
trust/ (8500), expert-answers/ (8600), voice/ (8700)
                                       → UNCHANGED, all 6 keep running;
                                         retiring any is a follow-up
```

`backend/` does not import from any of the 6 standalone product
directories — every product's code is copied, not referenced, mirroring
how `platform/`'s Agent Studio migration copied rather than imported the
root app's `lib/*`.

---

## 6. Repo Structure

```
backend/
├── src/
│   ├── backend/
│   │   └── main.py                   ← mounts all 6 sub-apps, GET /health
│   ├── agent_runtime/                ← copied from agent-runtime/src/agent_runtime
│   │   └── api.py                    ← + GET /v1/health (FR-4.3)
│   ├── adp/                          ← copied from agent-data-platform/src/adp
│   ├── channels/                     ← copied from channels/src/channels
│   ├── trust/                        ← copied from trust/src/trust
│   ├── expert_answers/               ← copied from expert-answers/src/expert_answers
│   └── voice/                        ← copied from voice/src/voice
├── migrations/
│   ├── adp/001_initial_schema.sql        ← tables renamed adp_*
│   ├── channels/001_initial_schema.sql   ← tables renamed channels_*
│   ├── trust/001_initial_schema.sql      ← tables renamed trust_*
│   ├── expert_answers/001_initial_schema.sql
│   └── voice/001_initial_schema.sql
├── data/
│   ├── platform.db                   ← shared SQLite (FR-3.1)
│   └── chroma/                       ← agent-runtime's vector store (FR-4.2)
├── tests/
│   ├── adp/, channels/, trust/, expert_answers/, voice/, agent_runtime/
├── pyproject.toml
├── requirements.txt                   ← reconciled versions (FR-2.1)
└── .venv/
```

---

## 7. Testing Plan

- Each product's existing pytest suite is ported into `backend/tests/<product>/`,
  updated for its renamed tables, new shared db path, and (for
  channels/voice/expert-answers) the repointed inter-service URLs in any
  test that mocks those calls. All must pass under `backend/`'s own
  pytest run.
- `ruff check` clean for `backend/src/`.
- Expert-answers' suite specifically re-verified passing under the bumped
  dependency versions (FR-2.2) — this is the one product where a
  dependency floor actually changed, not just a restatement.
- Manual verification, per product:
  1. Start `backend/` — `GET /health` → `200`.
  2. `GET /<prefix>/v1/health` → `200` for all 6 products (agent-runtime's
     is new, per FR-4.3).
  3. Exercise one write + one read per SQL-backed product (e.g., ADP:
     create a user/session/message, then `GET /adp/v1/stats` reflects
     them) — proves the renamed-table queries work end-to-end.
  4. `sqlite3 backend/data/platform.db ".tables"` shows all prefixed
     table names, no bare ones.
  5. Exercise one cross-service call end-to-end (e.g., Channels' chat
     flow, which calls agent-runtime's `/query` compatibility endpoint)
     and confirm it resolves via `http://localhost:8000/runtime`, not the
     old `:8001`.
  6. Confirm all 6 standalone apps (their original ports) still run and
     still work, untouched.

---

## 8. Open Questions / Follow-ups (explicitly out of scope here)

- When (and whether) to retire any of the 6 standalone apps in favor of
  the mounted-in-`backend/` versions.
- Whether the 6 standalone apps' own settings should eventually also be
  repointed at the unified base (today: only `backend/`'s own copies are,
  per FR-5; the standalone apps keep calling each other at their original
  ports indefinitely unless a future spec changes that).
- Whether any two products ever develop a genuinely shared entity worth a
  real cross-product schema (no such case exists today).
