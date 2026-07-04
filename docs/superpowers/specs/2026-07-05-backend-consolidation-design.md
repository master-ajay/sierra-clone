# Product Spec: Unified Backend Process (Phase 1) + ADP Pilot Migration (Phase 2)

Spec date: 2026-07-05
Status: Awaiting Gate 1
Depends on: none. Mirrors the pattern established by
`2026-07-05-platform-shell-design.md` (frontend consolidation), applied to the
Python backends.

---

## 1. Problem Statement

Every Python backend in this repo runs as its own FastAPI process, on its own
port, with its own venv, own SQLite file, and independently-drifting
dependency pins: agent-runtime (8001), agent-data-platform/ADP (8100), trust
(8500), expert-answers (8600), voice (8700). Version ranges are mostly
compatible (`fastapi>=0.115.0` in three of them, no pins in voice) except
expert-answers, which pins exact older versions (`fastapi==0.111.0`,
`pydantic==2.7.4`) that would need bumping to coexist with the others.

This spec defines what "consolidate the Python backend" means: one FastAPI
process, one port, each product mounted as an independent sub-application —
plus a full pilot migration of one backend (ADP) into it, proving the
pattern before repeating it for the other four. It also takes one real step
toward a shared database: ADP's SQLite file becomes a shared file other
products can add tables to later, not just a renamed copy of `adp.db`.

---

## 2. Goals (v1)

- G1: A single running FastAPI process (`backend/`, port 8000) that other
  products can mount into over time, proven by fully hosting ADP inside it.
- G2: ADP's routes, services, and data layer run inside `backend/` at
  `/adp/*`, functionally identical to today's standalone ADP (port 8100).
- G3: ADP's SQLite tables (`users`, `sessions`, `messages`) are renamed to
  `adp_users`, `adp_sessions`, `adp_messages` and live in one shared database
  file (`backend/data/platform.db`) — a real (if modest) step toward a
  shared database, sized to avoid a near-certain table-name collision when
  the next product joins, without inventing any cross-product shared schema
  that doesn't exist yet.
- G4: The existing standalone ADP process (`agent-data-platform/`, port
  8100) keeps running unmodified and undeleted through this spec — retiring
  it is a follow-up decision, not part of this work.

---

## 3. Non-Goals

- No migration of agent-runtime, trust, expert-answers, or voice into
  `backend/` — each gets its own future spec, following the pattern this one
  establishes.
- No bumping expert-answers' pinned dependency versions (needed before it
  can join the shared process, but out of scope here).
- No cross-product schema design (e.g., a shared `users` table reused by
  multiple products) — no such shared entity exists between any two
  products today, so inventing one now would be speculative, not
  requirements-driven.
- No retiring/deleting the standalone `agent-data-platform/` app.
- No auth/API-key unification across products (ADP's `require_api_key`
  dependency stays exactly as-is, scoped to `/adp/*`).

---

## 4. Functional Requirements

### FR-1: Backend process scaffold

- FR-1.1 New standalone Python project `backend/` (own `pyproject.toml`,
  own `.venv`, own `requirements.txt`), added to root workspace-adjacent
  tooling the same way `agent-runtime/`, `agent-data-platform/`, etc.
  already exist as sibling Python projects (this repo's Python projects are
  not npm workspace members — no `package.json` changes needed).
- FR-1.2 `backend/src/backend/main.py` defines one root `FastAPI` app.
  ADP's existing `FastAPI` app object (`agent-data-platform`'s
  `adp.main.app`, unmodified in its own repo) is mounted via
  `app.mount("/adp", adp_app)` — Starlette's native sub-app mounting, which
  preserves ADP's own lifespan hook, exception handler, and middleware
  without needing to re-register any of them on the parent app.
- FR-1.3 `backend/` runs on port 8000 — the one unclaimed port in the
  platform's numbering (3000, 3999, 8001, 8100, 8200/8201, 8300, 8400,
  8500/8501, 8600/8601, 8700/8701 are all taken).
- FR-1.4 Root health check: `GET /health` on the parent app (not `/adp`'s
  own `/v1/health`) returns `{"status": "ok"}`, independent of any mounted
  sub-app's health — proves the parent process itself is up even if a
  sub-app's dependencies (e.g., its own DB) are down.

### FR-2: ADP pilot migration

- FR-2.1 ADP's full `src/adp/` package (config, database, errors, auth,
  models, routes, services) is copied into `backend/src/adp/` — same
  package name and internal structure, so ADP's own code (which imports
  `from adp.config import ...`, `from adp.database import ...`, etc.)
  needs zero import-path changes, only its migration SQL and the 3
  table-referencing query sites (see FR-2.3).
- FR-2.2 `backend/`'s ADP copy points at `backend/data/platform.db` via
  `adp_db_path` (the existing `Settings.adp_db_path` field, just given a
  new default/env value) — not a new setting, reusing ADP's existing
  config mechanism.
- FR-2.3 ADP's migration SQL (`001_initial_schema.sql`) and every query
  referencing `users`, `sessions`, or `messages` as bare table names
  (confirmed sites: `database.py`, `routes/system.py`'s `stats` endpoint,
  and every file under `services/`) are updated to the prefixed names
  `adp_users`, `adp_sessions`, `adp_messages`. Foreign key references
  inside the migration SQL are updated to match.
- FR-2.4 ADP's existing test suite (`tests/*.py`) is copied into
  `backend/tests/adp/`, updated only for the renamed tables and the new
  `platform.db` path — assertions and test structure otherwise unchanged.
- FR-2.5 The standalone `agent-data-platform/` app (port 8100, `adp.db`)
  is untouched: same code, same port, same database, still fully
  functional after this migration lands.

---

## 5. Technical Architecture

```
backend/                           (new, port 8000)
  src/backend/main.py              → root FastAPI app, GET /health
  src/adp/                         → ADP's package, copied in, table names
                                      renamed (FR-2.3), mounted at /adp/*
  data/platform.db                 → shared SQLite file (adp_users,
                                      adp_sessions, adp_messages — future
                                      products add their own tables here)
  tests/adp/                       → ADP's test suite, ported

agent-data-platform/ (port 8100)   → UNCHANGED, still the "real" ADP
                                      deployment until a future spec retires it
```

`backend/` does not import from `agent-data-platform/` (no shared Python
package between the two — ADP's code is copied, not referenced, exactly
mirroring how `platform/`'s Agent Studio migration copied rather than
imported the root app's `lib/*`).

---

## 6. Repo Structure

```
backend/
├── src/
│   ├── backend/
│   │   └── main.py                 ← root app, mounts adp_app at /adp
│   └── adp/                         ← copied from agent-data-platform/src/adp
│       ├── __init__.py
│       ├── auth.py
│       ├── config.py                ← adp_db_path now points at platform.db
│       ├── database.py              ← run_migrations, get_connection (unchanged logic)
│       ├── errors.py
│       ├── main.py                  ← ADP's own FastAPI app object (mounted, not re-created)
│       ├── models/
│       ├── routes/                  ← system.py's stats query updated for renamed tables
│       └── services/                ← queries updated for renamed tables
├── migrations/
│   └── 001_initial_schema.sql       ← copied from agent-data-platform, tables renamed
├── data/
│   └── platform.db                  ← shared SQLite file (FR-2.2)
├── tests/
│   └── adp/                         ← ported ADP test suite (FR-2.4)
├── pyproject.toml
├── requirements.txt                  ← ADP's existing deps, unchanged versions
└── .venv/
```

---

## 7. Testing Plan

- Reuse ADP's existing pytest suite (`test_system.py`, `test_users.py`,
  `test_sessions.py`, `test_messages.py`, `test_context.py`,
  `test_search.py`, `test_integration.py`), updated for the renamed tables
  and new db path. All must pass under `backend/`'s own pytest run.
- `ruff check` clean for `backend/src/`.
- Manual verification (same bar as every prior migration in this repo):
  1. Start `backend/` (`uvicorn backend.main:app --port 8000`) —
     `GET /health` → `200`.
  2. `GET /adp/v1/health` → `200`, `database: connected`.
  3. Create a user, session, and message via `/adp/*` endpoints; confirm
     `GET /adp/v1/stats` reflects them (proves the renamed-table queries
     work end-to-end, not just at the schema level).
  4. Confirm `sqlite3 backend/data/platform.db ".tables"` shows
     `adp_users`, `adp_sessions`, `adp_messages` — not the old bare names.
  5. Confirm the standalone `agent-data-platform/` app (port 8100) still
     runs and still works against its own unmodified `adp.db`.

---

## 8. Open Questions / Follow-ups (explicitly out of scope here)

- When (and whether) to retire the standalone `agent-data-platform/` app in
  favor of the mounted-in-`backend/` version.
- Order and approach for migrating agent-runtime, trust, expert-answers,
  and voice — including expert-answers' dependency-version bump.
- Whether any two products ever develop a genuinely shared entity worth a
  real cross-product schema (no such case exists today).
