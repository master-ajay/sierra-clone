# Unified Backend Process — All 6 Python Backends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `backend/`, one FastAPI process on port 8000 that mounts all 6 Python backends (agent-runtime, ADP, channels, trust, expert-answers, voice) as independent sub-applications, sharing one SQLite file for the 5 SQL-backed products and talking to each other through paths instead of hardcoded ports — while every existing standalone process keeps running unmodified.

**Architecture:** Each product's `FastAPI` app object is copied (not imported) into `backend/src/<product>/` and mounted via Starlette's `app.mount("/<prefix>", product_app)`, which preserves each product's own lifespan hook, exception handlers, and middleware untouched. The 5 SQL-backed products' migration SQL and query call sites get their bare table names renamed with a product prefix so they can coexist in one file; agent-runtime's ChromaDB/BM25 vector store moves to a sibling directory instead, since it isn't a SQL schema.

**Tech Stack:** Python 3.11+, FastAPI, Starlette (native app mounting), `pydantic-settings`, raw `sqlite3` (no ORM), pytest, ruff.

## Global Constraints

- All 6 existing standalone apps (`agent-runtime/` :8001, `agent-data-platform/` :8100, `channels/` :8200, `trust/` :8500, `expert-answers/` :8600, `voice/` :8700) must keep running unmodified through every task — each task only reads from them as a copy source, never edits them.
- `backend/` runs on port 8000.
- No changing any product's external API contract (its own route paths/request/response shapes under its own mount prefix) — only where it runs and what it's called by siblings changes.
- No auth/API-key unification — each product keeps its own `*_api_key` setting and auth dependency, scoped to its own prefix.
- `backend/requirements.txt` version floor (applies to every task that touches it): `fastapi>=0.115.0`, `uvicorn[standard]>=0.30.0`, `pydantic>=2.8.0`, `pydantic-settings>=2.4.0`, `httpx>=0.27.0`, `respx>=0.21.0`, `pytest>=8.3.0`, `pytest-asyncio>=0.23.0`, `ruff>=0.8.0`, plus agent-runtime's extras: `openai>=1.0.0`, `chromadb>=0.5.0`, `rank-bm25>=0.2.2`, `pypdf>=4.3.0`.
- `ruff check` and each product's own ported test suite must pass before a task is done.

---

### Task 1: Scaffold `backend/` project

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/requirements.txt`
- Create: `backend/src/backend/__init__.py`
- Create: `backend/src/backend/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_health.py`
- Create: `backend/.gitignore`

**Interfaces:**
- Produces: `backend.main:app` — a `FastAPI` instance with one route, `GET /health` → `{"status": "ok"}`. Tasks 2–7 each add one `app.mount("/<prefix>", <product>_app)` call to this file.

- [ ] **Step 1: Create the venv and directory structure**

```bash
mkdir -p backend/src/backend backend/tests backend/data
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

- [ ] **Step 2: Write `backend/pyproject.toml`**

```toml
[project]
name = "backend"
version = "0.1.0"
requires-python = ">=3.11"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]

[tool.ruff]
line-length = 130

[tool.ruff.lint]
select = ["E", "F", "I"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

- [ ] **Step 3: Write `backend/requirements.txt`**

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.8.0
pydantic-settings>=2.4.0
httpx>=0.27.0
respx>=0.21.0
pytest>=8.3.0
pytest-asyncio>=0.23.0
ruff>=0.8.0
openai>=1.0.0
chromadb>=0.5.0
rank-bm25>=0.2.2
pypdf>=4.3.0
```

- [ ] **Step 4: Write `backend/.gitignore`**

```
.venv/
__pycache__/
*.pyc
data/platform.db
data/platform.db-*
data/chroma/
.pytest_cache/
```

- [ ] **Step 5: Write `backend/src/backend/__init__.py`** (empty file)

- [ ] **Step 6: Write the failing test**

`backend/tests/__init__.py` (empty file), then `backend/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from backend.main import app


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 7: Run test to verify it fails**

```bash
pip install -r requirements.txt
pip install -e .
pytest tests/test_health.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'backend.main'`.

- [ ] **Step 8: Write `backend/src/backend/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="Sierra Platform Backend")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 9: Run test to verify it passes**

```bash
pytest tests/test_health.py -v
```

Expected: PASS (1 passed).

- [ ] **Step 10: Boot verification**

```bash
uvicorn backend.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/health
kill %1
```

Expected: `{"status":"ok"}`.

- [ ] **Step 11: ruff check and commit**

```bash
ruff check src/
cd ..
git add backend/
git commit -m "Scaffold backend/ project: reconciled deps, root FastAPI app, GET /health"
```

---

### Task 2: Migrate Agent Data Platform (ADP) into `backend/`

**Files:**
- Create: `backend/src/adp/` (copied from `agent-data-platform/src/adp/`, table names renamed)
- Create: `backend/migrations/adp/001_initial_schema.sql` (renamed tables)
- Create: `backend/tests/adp/` (copied from `agent-data-platform/tests/`, updated for renamed tables + new db path)
- Modify: `backend/src/backend/main.py` (mount `/adp`)

**Interfaces:**
- Consumes: none from other tasks.
- Produces: `adp.main:app` mounted at `/adp` in the parent app — `GET /adp/v1/health`, `GET /adp/v1/stats`, and the rest of ADP's existing routes (`/adp/v1/users/*`, `/adp/v1/sessions/*`, etc., unchanged paths since only the mount prefix is new, not ADP's own route definitions).

- [ ] **Step 1: Copy ADP's package into `backend/src/adp/`**

```bash
cp -r agent-data-platform/src/adp backend/src/adp
mkdir -p backend/migrations/adp
```

- [ ] **Step 2: Write the renamed migration, `backend/migrations/adp/001_initial_schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS adp_users (
    user_id       TEXT PRIMARY KEY,
    external_id   TEXT UNIQUE,
    display_name  TEXT NOT NULL,
    metadata      TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS adp_sessions (
    session_id    TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES adp_users(user_id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    metadata      TEXT NOT NULL DEFAULT '{}',
    started_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    closed_at     TEXT
);

CREATE TABLE IF NOT EXISTS adp_messages (
    message_id    TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES adp_sessions(session_id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content       TEXT NOT NULL,
    metadata      TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adp_sessions_user_id ON adp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_adp_sessions_status ON adp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_adp_messages_session_id ON adp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_adp_messages_created_at ON adp_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_adp_users_external_id ON adp_users(external_id);
```

- [ ] **Step 3: Point `backend/src/adp/database.py` at its own migrations subfolder**

In `backend/src/adp/database.py`, change:

```python
def run_migrations(db_path: str) -> None:
    migrations_dir = Path(__file__).parent.parent.parent / "migrations"
```

to:

```python
def run_migrations(db_path: str) -> None:
    migrations_dir = Path(__file__).parent.parent.parent / "migrations" / "adp"
```

(Without this change, `migrations_dir.glob("*.sql")` would look in `backend/migrations/` directly and find nothing, since Task 2's migration lives in `backend/migrations/adp/`.)

- [ ] **Step 4: Rename every table reference in `backend/src/adp/services/user_service.py`**

Apply these exact replacements (each old string appears once at the line noted):

- Line ~28: `"INSERT INTO users (user_id, ...` → `"INSERT INTO adp_users (user_id, ...` (keep the rest of the string identical, only `users` → `adp_users` right after `INSERT INTO`)
- Line ~37: `"SELECT * FROM users WHERE user_id = ?"` → `"SELECT * FROM adp_users WHERE user_id = ?"`
- Line ~42: `"SELECT * FROM users WHERE external_id = ?"` → `"SELECT * FROM adp_users WHERE external_id = ?"`
- Line ~49: `"SELECT * FROM users WHERE created_at < ? ORDER BY created_at DESC LIMIT ?"` → `"SELECT * FROM adp_users WHERE created_at < ? ORDER BY created_at DESC LIMIT ?"`
- Line ~54: `"SELECT * FROM users ORDER BY created_at DESC LIMIT ?"` → `"SELECT * FROM adp_users ORDER BY created_at DESC LIMIT ?"`
- Line ~70: `"UPDATE users SET display_name = ?, metadata = ?, updated_at = ? WHERE user_id = ?"` → `"UPDATE adp_users SET display_name = ?, metadata = ?, updated_at = ? WHERE user_id = ?"`
- Line ~78: `"DELETE FROM users WHERE user_id = ?"` → `"DELETE FROM adp_users WHERE user_id = ?"`

- [ ] **Step 5: Rename every table reference in `backend/src/adp/services/session_service.py`**

- Line ~29: `"INSERT INTO sessions (session_id, ...` → `"INSERT INTO adp_sessions (session_id, ...`
- Line ~37: `"SELECT * FROM sessions WHERE session_id = ?"` → `"SELECT * FROM adp_sessions WHERE session_id = ?"`
- Line ~46: `"SELECT * FROM sessions WHERE user_id=? AND status=? AND started_at<? ORDER BY started_at DESC LIMIT ?"` → same with `adp_sessions`
- Line ~51: `"SELECT * FROM sessions WHERE user_id=? AND status=? ORDER BY started_at DESC LIMIT ?"` → same with `adp_sessions`
- Line ~56: `"SELECT * FROM sessions WHERE user_id=? AND started_at<? ORDER BY started_at DESC LIMIT ?"` → same with `adp_sessions`
- Line ~61: `"SELECT * FROM sessions WHERE user_id=? ORDER BY started_at DESC LIMIT ?"` → same with `adp_sessions`
- Line ~78: `"UPDATE sessions SET metadata=?, status=?, updated_at=? WHERE session_id=?"` → same with `adp_sessions`
- Line ~91: `"UPDATE sessions SET status='closed', closed_at=?, updated_at=? WHERE session_id=?"` → same with `adp_sessions`

- [ ] **Step 6: Rename every table reference in `backend/src/adp/services/message_service.py`**

- Line ~28: `"INSERT INTO messages (message_id, ...` → `"INSERT INTO adp_messages (message_id, ...`
- Line ~31: `"UPDATE sessions SET updated_at=? WHERE session_id=?"` → `"UPDATE adp_sessions SET updated_at=? WHERE session_id=?"`
- Line ~33: `"SELECT * FROM messages WHERE message_id=?"` → `"SELECT * FROM adp_messages WHERE message_id=?"`
- Line ~49: `"SELECT * FROM messages WHERE session_id=? AND created_at>? ORDER BY created_at ASC LIMIT ?"` → same with `adp_messages`
- Line ~54: `"SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC LIMIT ?"` → same with `adp_messages`

- [ ] **Step 7: Rename every table reference in `backend/src/adp/services/search_service.py` and `context_service.py`**

`search_service.py` — both occurrences of:
```sql
"SELECT m.* FROM messages m "
```
→
```sql
"SELECT m.* FROM adp_messages m "
```
and both occurrences of:
```sql
"JOIN sessions s ON m.session_id = s.session_id "
```
→
```sql
"JOIN adp_sessions s ON m.session_id = s.session_id "
```

`context_service.py` line ~13: `"SELECT COUNT(*) as cnt, MAX(updated_at) as last FROM sessions WHERE user_id=?"` → same with `adp_sessions`. (Do NOT touch the local Python variable `messages` used later in this file — that's a variable name, not a table reference.)

- [ ] **Step 8: Rename the table references in `backend/src/adp/routes/system.py`**

```python
total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
active_sessions = conn.execute("SELECT COUNT(*) FROM sessions WHERE status='active'").fetchone()[0]
closed_sessions = conn.execute("SELECT COUNT(*) FROM sessions WHERE status='closed'").fetchone()[0]
total_messages = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
```

becomes:

```python
total_users = conn.execute("SELECT COUNT(*) FROM adp_users").fetchone()[0]
active_sessions = conn.execute("SELECT COUNT(*) FROM adp_sessions WHERE status='active'").fetchone()[0]
closed_sessions = conn.execute("SELECT COUNT(*) FROM adp_sessions WHERE status='closed'").fetchone()[0]
total_messages = conn.execute("SELECT COUNT(*) FROM adp_messages").fetchone()[0]
```

Do NOT change the JSON response keys (`"users"`, `"sessions"`, `"messages"`) later in the same function — those are the external API contract, not table names.

- [ ] **Step 9: Verify no bare table references remain**

```bash
grep -rn "FROM users\|INTO users\|UPDATE users\|FROM sessions\|INTO sessions\|UPDATE sessions\|JOIN sessions\|FROM messages\|INTO messages\|UPDATE messages" backend/src/adp/
```

Expected: no output (every match should now read `adp_users`/`adp_sessions`/`adp_messages`).

- [ ] **Step 10: Set ADP's db path default for `backend/`**

In `backend/src/adp/config.py`, change:

```python
    adp_db_path: str = "data/adp.db"
```

to:

```python
    adp_db_path: str = "data/platform.db"
```

- [ ] **Step 11: Copy and update ADP's test suite**

```bash
mkdir -p backend/tests/adp
cp agent-data-platform/tests/*.py backend/tests/adp/
```

In every copied test file, update any fixture/constant that references the old table names (`users`, `sessions`, `messages`) or the old db filename (`adp.db`) to the renamed equivalents (`adp_users`, `adp_sessions`, `adp_messages`, `platform.db`). Read `backend/tests/adp/conftest.py` first — it's the shared fixture that likely sets up the test database — and apply the same table-name and path substitutions there.

- [ ] **Step 12: Mount ADP in `backend/src/backend/main.py`**

```python
from fastapi import FastAPI

from adp.main import app as adp_app

app = FastAPI(title="Sierra Platform Backend")

app.mount("/adp", adp_app)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 13: Run ADP's ported test suite**

```bash
cd backend
pytest tests/adp -v
```

Expected: same test count and pass rate as `agent-data-platform/tests/` originally had.

- [ ] **Step 14: Boot verification**

```bash
uvicorn backend.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/adp/v1/health
sqlite3 data/platform.db ".tables"
kill %1
```

Expected: health returns `{"status":"ok","database":"connected"}`; `.tables` shows `adp_messages`, `adp_sessions`, `adp_users`.

- [ ] **Step 15: ruff check and commit**

```bash
ruff check src/adp src/backend
cd ..
git add backend/
git commit -m "Migrate ADP into backend/, tables renamed adp_*, mounted at /adp"
```

---

### Task 3: Migrate Trust & Reliability into `backend/`

**Files:**
- Create: `backend/src/trust/` (copied from `trust/src/trust/`, table renamed)
- Create: `backend/migrations/trust/001_initial_schema.sql`
- Create: `backend/tests/trust/`
- Modify: `backend/src/backend/main.py` (mount `/trust`)

**Interfaces:**
- Consumes: none from other tasks (independent of ADP).
- Produces: `trust.main:app` mounted at `/trust` — `GET /trust/v1/health`, `GET /trust/v1/stats`, `POST /trust/v1/check`, `GET /trust/v1/audit`.

- [ ] **Step 1: Copy Trust's package**

```bash
cp -r trust/src/trust backend/src/trust
mkdir -p backend/migrations/trust
```

- [ ] **Step 2: Write `backend/migrations/trust/001_initial_schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS trust_audit_log (
    audit_id      TEXT PRIMARY KEY,
    channel_id    TEXT NOT NULL,
    direction     TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
    message_clean TEXT NOT NULL,
    flags         TEXT NOT NULL,
    allowed       INTEGER NOT NULL,
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trust_audit_channel ON trust_audit_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_trust_audit_created ON trust_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_trust_audit_allowed ON trust_audit_log(allowed);
```

- [ ] **Step 3: Point `backend/src/trust/database.py` at its own migrations subfolder**

Same edit pattern as Task 2 Step 3:

```python
    migrations_dir = Path(__file__).parent.parent.parent / "migrations" / "trust"
```

- [ ] **Step 4: Rename every table reference in `backend/src/trust/services/audit_service.py`**

- `"INSERT INTO audit_log (audit_id, channel_id, direction, message_clean, flags, allowed, created_at) VALUES (?,?,?,?,?,?,?)"` → `"INSERT INTO trust_audit_log (audit_id, channel_id, direction, message_clean, flags, allowed, created_at) VALUES (?,?,?,?,?,?,?)"`
- `"SELECT * FROM audit_log WHERE audit_id=?"` → `"SELECT * FROM trust_audit_log WHERE audit_id=?"`
- `"SELECT * FROM audit_log WHERE created_at<? ORDER BY created_at DESC LIMIT ?"` → same with `trust_audit_log`
- `"SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?"` → same with `trust_audit_log`
- `"SELECT COUNT(*) FROM audit_log"` → `"SELECT COUNT(*) FROM trust_audit_log"`
- `"SELECT COUNT(*) FROM audit_log WHERE allowed=0"` → same with `trust_audit_log`
- `"SELECT COUNT(*) FROM audit_log WHERE flags LIKE '%\"type\": \"pii\"%'"` → same with `trust_audit_log`
- `"SELECT COUNT(*) FROM audit_log WHERE flags LIKE '%\"type\": \"prompt_injection\"%'"` → same with `trust_audit_log`
- `"SELECT COUNT(*) FROM audit_log WHERE flags LIKE '%\"type\": \"rate_limit\"%'"` → same with `trust_audit_log`

- [ ] **Step 5: Verify no bare table references remain**

```bash
grep -rn "FROM audit_log\|INTO audit_log\|UPDATE audit_log\|JOIN audit_log" backend/src/trust/
```

Expected: no output.

- [ ] **Step 6: Set Trust's db path default**

In `backend/src/trust/config.py`:

```python
    trust_db_path: str = "data/platform.db"
```

- [ ] **Step 7: Copy and update Trust's test suite**

```bash
mkdir -p backend/tests/trust
cp trust/tests/*.py backend/tests/trust/
```

Update `backend/tests/trust/conftest.py` and any test referencing `audit_log` or `trust.db` to `trust_audit_log` and `platform.db`.

- [ ] **Step 8: Mount Trust**

In `backend/src/backend/main.py`, add:

```python
from trust.main import app as trust_app
```

and:

```python
app.mount("/trust", trust_app)
```

- [ ] **Step 9: Run Trust's ported test suite**

```bash
cd backend
pytest tests/trust -v
```

Expected: same pass count as `trust/tests/` originally had.

- [ ] **Step 10: Boot verification**

```bash
uvicorn backend.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/trust/v1/health
sqlite3 data/platform.db ".tables"
kill %1
```

Expected: health returns `{"status":"ok","database":"connected"}`; `.tables` now also shows `trust_audit_log`.

- [ ] **Step 11: ruff check and commit**

```bash
ruff check src/trust src/backend
cd ..
git add backend/
git commit -m "Migrate Trust & Reliability into backend/, table renamed trust_audit_log, mounted at /trust"
```

---

### Task 4: Migrate Channels into `backend/`

**Files:**
- Create: `backend/src/channels/` (copied, tables renamed, inter-service URLs repointed)
- Create: `backend/migrations/channels/001_initial_schema.sql`
- Create: `backend/tests/channels/`
- Modify: `backend/src/backend/main.py` (mount `/channels`)

**Interfaces:**
- Consumes: none directly (calls ADP/agent-runtime/Trust over HTTP at runtime, not at the Python-import level — those calls are repointed in this task, but Tasks 2/3/7 don't need to exist yet for Channels' own code to be copied and mounted; the repointed URLs simply won't resolve until the corresponding task lands).
- Produces: `channels.main:app` mounted at `/channels`.

- [ ] **Step 1: Copy Channels' package**

```bash
cp -r channels/src/channels backend/src/channels
mkdir -p backend/migrations/channels
```

- [ ] **Step 2: Write `backend/migrations/channels/001_initial_schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS channels_channels (
    channel_id   TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    adp_user_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL CHECK(type IN ('widget', 'api')),
    status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'revoked')),
    channel_key  TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channels_channel_stats (
    channel_id      TEXT PRIMARY KEY REFERENCES channels_channels(channel_id) ON DELETE CASCADE,
    total_messages  INTEGER NOT NULL DEFAULT 0,
    total_sessions  INTEGER NOT NULL DEFAULT 0,
    last_active_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_channels_channels_agent_id ON channels_channels(agent_id);
CREATE INDEX IF NOT EXISTS idx_channels_channels_status   ON channels_channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_channels_key      ON channels_channels(channel_key);
```

(`total_messages`/`total_sessions` are *column* names inside `channels_channel_stats`, unrelated to ADP's `adp_messages`/`adp_sessions` tables — they are not renamed.)

- [ ] **Step 3: Point `backend/src/channels/database.py` at its own migrations subfolder**

```python
    migrations_dir = Path(__file__).parent.parent.parent / "migrations" / "channels"
```

- [ ] **Step 4: Rename table references in `backend/src/channels/routes/system.py`**

```python
total_channels = conn.execute("SELECT COUNT(*) FROM channels").fetchone()[0]
active = conn.execute("SELECT COUNT(*) FROM channels WHERE status='active'").fetchone()[0]
total_messages = conn.execute("SELECT COALESCE(SUM(total_messages),0) FROM channel_stats").fetchone()[0]
```

becomes:

```python
total_channels = conn.execute("SELECT COUNT(*) FROM channels_channels").fetchone()[0]
active = conn.execute("SELECT COUNT(*) FROM channels_channels WHERE status='active'").fetchone()[0]
total_messages = conn.execute("SELECT COALESCE(SUM(total_messages),0) FROM channels_channel_stats").fetchone()[0]
```

(The `SUM(total_messages)` inside the query is the *column* — unchanged; only the `FROM` table name changes.)

- [ ] **Step 5: Rename table references in `backend/src/channels/routes/channels.py`**

```python
row = conn.execute("SELECT * FROM channel_stats WHERE channel_id=?", (channel_id,)).fetchone()
```
→
```python
row = conn.execute("SELECT * FROM channels_channel_stats WHERE channel_id=?", (channel_id,)).fetchone()
```

- [ ] **Step 6: Rename table references in `backend/src/channels/services/chat_service.py`**

```python
"UPDATE channel_stats SET total_messages=total_messages+1, last_active_at=? WHERE channel_id=?",
```
→
```python
"UPDATE channels_channel_stats SET total_messages=total_messages+1, last_active_at=? WHERE channel_id=?",
```

and:

```python
"UPDATE channel_stats SET total_sessions=total_sessions+1 WHERE channel_id=?",
```
→
```python
"UPDATE channels_channel_stats SET total_sessions=total_sessions+1 WHERE channel_id=?",
```

- [ ] **Step 7: Rename table references in `backend/src/channels/services/channel_service.py`**

- `"INSERT INTO channels (channel_id, agent_id, adp_user_id, name, type, channel_key, created_at, updated_at) "` → `"INSERT INTO channels_channels (channel_id, agent_id, adp_user_id, name, type, channel_key, created_at, updated_at) "`
- `"INSERT INTO channel_stats (channel_id) VALUES (?)"` → `"INSERT INTO channels_channel_stats (channel_id) VALUES (?)"`
- `"SELECT * FROM channels WHERE channel_id=?"` → `"SELECT * FROM channels_channels WHERE channel_id=?"`
- `"SELECT * FROM channels WHERE channel_key=?"` → `"SELECT * FROM channels_channels WHERE channel_key=?"`
- `f"SELECT * FROM channels {where} ORDER BY created_at DESC LIMIT ?"` → `f"SELECT * FROM channels_channels {where} ORDER BY created_at DESC LIMIT ?"`
- `"UPDATE channels SET name=?, status=?, updated_at=? WHERE channel_id=?"` → `"UPDATE channels_channels SET name=?, status=?, updated_at=? WHERE channel_id=?"`
- `"DELETE FROM channels WHERE channel_id=?"` → `"DELETE FROM channels_channels WHERE channel_id=?"`

- [ ] **Step 8: Verify no bare table references remain**

```bash
grep -rn "FROM channels \|FROM channels\"\|INTO channels \|UPDATE channels \|FROM channel_stats\|INTO channel_stats\|UPDATE channel_stats\|JOIN channel_stats" backend/src/channels/
```

Expected: no output (all should now read `channels_channels`/`channels_channel_stats`).

- [ ] **Step 9: Set Channels' db path default and repoint inter-service URLs**

In `backend/src/channels/config.py`:

```python
    channels_db_path: str = "data/platform.db"
    channels_adp_url: str = "http://localhost:8000/adp"
    channels_runtime_url: str = "http://localhost:8000/runtime"
    channels_trust_url: str = "http://localhost:8000/trust"
```

(`channels_adp_api_key` and `channels_trust_api_key` are left unchanged — only the URLs move, not the credentials, per spec FR-5.2.)

- [ ] **Step 10: Copy and update Channels' test suite**

```bash
mkdir -p backend/tests/channels
cp channels/tests/*.py backend/tests/channels/
```

Update `backend/tests/channels/conftest.py` and any test referencing `channels`/`channel_stats` tables or `channels.db` to `channels_channels`/`channels_channel_stats`/`platform.db`. Update any test that mocks `channels_adp_url`/`channels_runtime_url`/`channels_trust_url` (via `respx` or similar) to the new unified-base URLs from Step 9.

- [ ] **Step 11: Mount Channels**

In `backend/src/backend/main.py`, add:

```python
from channels.main import app as channels_app
```

and:

```python
app.mount("/channels", channels_app)
```

- [ ] **Step 12: Run Channels' ported test suite**

```bash
cd backend
pytest tests/channels -v
```

Expected: same pass count as `channels/tests/` originally had.

- [ ] **Step 13: Boot verification**

```bash
uvicorn backend.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/channels/v1/health
sqlite3 data/platform.db ".tables"
kill %1
```

Expected: health returns `200`; `.tables` now also shows `channels_channels`, `channels_channel_stats`.

- [ ] **Step 14: ruff check and commit**

```bash
ruff check src/channels src/backend
cd ..
git add backend/
git commit -m "Migrate Channels into backend/, tables renamed channels_*, URLs repointed, mounted at /channels"
```

---

### Task 5: Migrate Expert Answers into `backend/`

**Files:**
- Create: `backend/src/expert_answers/` (copied, tables renamed, inter-service URLs repointed, verified under bumped dependency versions)
- Create: `backend/migrations/expert_answers/001_initial_schema.sql`
- Create: `backend/tests/expert_answers/`
- Modify: `backend/src/backend/main.py` (mount `/expert-answers`)

**Interfaces:**
- Consumes: none directly.
- Produces: `expert_answers.main:app` mounted at `/expert-answers`.

- [ ] **Step 1: Copy Expert Answers' package**

```bash
cp -r expert-answers/src/expert_answers backend/src/expert_answers
mkdir -p backend/migrations/expert_answers
```

- [ ] **Step 2: Write `backend/migrations/expert_answers/001_initial_schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS expert_answers_resolutions (
    resolution_id     TEXT PRIMARY KEY,
    conversation_id   TEXT NOT NULL,
    adp_session_id    TEXT,
    transcript_json   TEXT NOT NULL,
    resolution_note   TEXT NOT NULL,
    topic             TEXT,
    status            TEXT NOT NULL DEFAULT 'pending_draft'
                        CHECK(status IN ('pending_draft','draft_failed','drafted')),
    created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expert_answers_knowledge_articles (
    article_id    TEXT PRIMARY KEY,
    resolution_id TEXT NOT NULL REFERENCES expert_answers_resolutions(resolution_id),
    title         TEXT NOT NULL,
    body          TEXT NOT NULL,
    cited_excerpt TEXT NOT NULL,
    topic         TEXT,
    status        TEXT NOT NULL DEFAULT 'pending_review'
                    CHECK(status IN ('pending_review','approved','rejected','published')),
    published_at  TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expert_answers_articles_status ON expert_answers_knowledge_articles(status);
CREATE INDEX IF NOT EXISTS idx_expert_answers_articles_topic  ON expert_answers_knowledge_articles(topic);
CREATE INDEX IF NOT EXISTS idx_expert_answers_resolutions_topic ON expert_answers_resolutions(topic);
```

- [ ] **Step 3: Point `backend/src/expert_answers/database.py` at its own migration file**

Expert Answers' `database.py` reads a single named file directly rather than globbing a directory. Change:

```python
    sql = (Path(__file__).parents[2] / "migrations" / "001_initial_schema.sql").read_text()
```

to:

```python
    sql = (Path(__file__).parents[2] / "migrations" / "expert_answers" / "001_initial_schema.sql").read_text()
```

- [ ] **Step 4: Rename table references in `backend/src/expert_answers/services/resolution_service.py`**

- `"INSERT INTO resolutions (resolution_id, conversation_id, adp_session_id, transcript_json, resolution_note, topic, status, created_at) VALUES (?,?,?,?,?,?,?,?)"` → `"INSERT INTO expert_answers_resolutions (resolution_id, conversation_id, adp_session_id, transcript_json, resolution_note, topic, status, created_at) VALUES (?,?,?,?,?,?,?,?)"`
- `"SELECT * FROM resolutions WHERE resolution_id=?"` → `"SELECT * FROM expert_answers_resolutions WHERE resolution_id=?"`
- `"SELECT transcript_json FROM resolutions WHERE resolution_id=?"` → `"SELECT transcript_json FROM expert_answers_resolutions WHERE resolution_id=?"`
- `"UPDATE resolutions SET status=? WHERE resolution_id=?"` → `"UPDATE expert_answers_resolutions SET status=? WHERE resolution_id=?"`
- `"SELECT resolution_id, transcript_json, resolution_note FROM resolutions WHERE topic=? AND status='drafted' ORDER BY created_at DESC LIMIT ?"` → same with `expert_answers_resolutions`

- [ ] **Step 5: Rename table references in `backend/src/expert_answers/services/article_service.py`**

- `"SELECT conversation_id FROM resolutions WHERE resolution_id=?"` → `"SELECT conversation_id FROM expert_answers_resolutions WHERE resolution_id=?"`
- `"INSERT INTO knowledge_articles (article_id, resolution_id, title, body, cited_excerpt, topic, status, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"` → `"INSERT INTO expert_answers_knowledge_articles (article_id, resolution_id, title, body, cited_excerpt, topic, status, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"`
- `"SELECT * FROM knowledge_articles WHERE article_id=?"` → `"SELECT * FROM expert_answers_knowledge_articles WHERE article_id=?"`
- `f"SELECT a.*, r.conversation_id FROM knowledge_articles a JOIN resolutions r ON a.resolution_id=r.resolution_id {where} ORDER BY a.created_at DESC LIMIT ?"` → `f"SELECT a.*, r.conversation_id FROM expert_answers_knowledge_articles a JOIN expert_answers_resolutions r ON a.resolution_id=r.resolution_id {where} ORDER BY a.created_at DESC LIMIT ?"`
- `f"UPDATE knowledge_articles SET {', '.join(sets)} WHERE article_id=?"` → `f"UPDATE expert_answers_knowledge_articles SET {', '.join(sets)} WHERE article_id=?"`

- [ ] **Step 6: Verify no bare table references remain**

```bash
grep -rn "FROM resolutions\|INTO resolutions\|UPDATE resolutions\|JOIN resolutions\|FROM knowledge_articles\|INTO knowledge_articles\|UPDATE knowledge_articles\|JOIN knowledge_articles" backend/src/expert_answers/
```

Expected: no output.

- [ ] **Step 7: Set Expert Answers' db path default and repoint inter-service URLs**

In `backend/src/expert_answers/config.py`:

```python
class Settings(BaseSettings):
    expert_answers_api_key: str = "change-me"
    expert_answers_db_path: str = "data/platform.db"
    expert_answers_adp_url: str = "http://localhost:8000/adp"
    expert_answers_adp_api_key: str = "change-me"
    expert_answers_runtime_url: str = "http://localhost:8000/runtime"
    expert_answers_runtime_api_key: str = "change-me"
    expert_answers_trust_url: str = "http://localhost:8000/trust"
    expert_answers_trust_api_key: str = "change-me"
```

- [ ] **Step 8: Copy and update Expert Answers' test suite**

```bash
mkdir -p backend/tests/expert_answers
cp expert-answers/tests/*.py backend/tests/expert_answers/
```

Update `conftest.py` and any test referencing `resolutions`/`knowledge_articles` tables or `expert_answers.db` to the prefixed names and `platform.db`. Update any `respx`-mocked URL for `expert_answers_adp_url`/`expert_answers_runtime_url`/`expert_answers_trust_url` to the new unified-base values.

- [ ] **Step 9: Mount Expert Answers**

In `backend/src/backend/main.py`, add:

```python
from expert_answers.main import app as expert_answers_app
```

and:

```python
app.mount("/expert-answers", expert_answers_app)
```

- [ ] **Step 10: Run Expert Answers' ported test suite under the bumped dependency floor**

```bash
cd backend
pytest tests/expert_answers -v
```

Expected: same pass count as `expert-answers/tests/` originally had, now running against `fastapi>=0.115.0`/`pydantic>=2.8.0` instead of the standalone app's pinned `fastapi==0.111.0`/`pydantic==2.7.4`. If any test fails specifically due to a Pydantic v2.8 behavior change (e.g., stricter validation), fix the failing assertion or model field in `backend/src/expert_answers/` only — never in the standalone `expert-answers/` app.

- [ ] **Step 11: Boot verification**

```bash
uvicorn backend.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/expert-answers/v1/health
sqlite3 data/platform.db ".tables"
kill %1
```

Expected: health returns `200`; `.tables` now also shows `expert_answers_resolutions`, `expert_answers_knowledge_articles`.

- [ ] **Step 12: ruff check and commit**

```bash
ruff check src/expert_answers src/backend
cd ..
git add backend/
git commit -m "Migrate Expert Answers into backend/, tables renamed expert_answers_*, deps bumped, mounted at /expert-answers"
```

---

### Task 6: Migrate Voice into `backend/`

**Files:**
- Create: `backend/src/voice/` (copied, tables renamed, inter-service URLs repointed)
- Create: `backend/migrations/voice/001_initial_schema.sql`
- Create: `backend/tests/voice/`
- Modify: `backend/src/backend/main.py` (mount `/voice`)

**Interfaces:**
- Consumes: none directly.
- Produces: `voice.main:app` mounted at `/voice`.

- [ ] **Step 1: Copy Voice's package**

```bash
cp -r voice/src/voice backend/src/voice
mkdir -p backend/migrations/voice
```

- [ ] **Step 2: Write `backend/migrations/voice/001_initial_schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS voice_lines (
    line_id      TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    adp_user_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','revoked')),
    line_key     TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_calls (
    call_id           TEXT PRIMARY KEY,
    line_id           TEXT NOT NULL REFERENCES voice_lines(line_id),
    session_id        TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active'
                        CHECK(status IN ('active','escalated','completed')),
    sentiment_trend_json TEXT NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL,
    ended_at          TEXT
);

CREATE TABLE IF NOT EXISTS voice_payment_attempts (
    payment_id         TEXT PRIMARY KEY,
    call_id            TEXT NOT NULL REFERENCES voice_calls(call_id),
    masked_card_last4  TEXT NOT NULL,
    amount             REAL NOT NULL,
    currency           TEXT NOT NULL,
    status             TEXT NOT NULL CHECK(status IN ('collected','blocked')),
    created_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_lines_agent_id ON voice_lines(agent_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_line_id  ON voice_calls(line_id);
```

- [ ] **Step 3: Point `backend/src/voice/database.py` at its own migrations subfolder**

```python
    migrations_dir = Path(__file__).parent.parent.parent / "migrations" / "voice"
```

- [ ] **Step 4: Rename the table reference in `backend/src/voice/auth.py`**

```python
row = conn.execute("SELECT line_key, status FROM lines WHERE line_id=?", (line_id,)).fetchone()
```
→
```python
row = conn.execute("SELECT line_key, status FROM voice_lines WHERE line_id=?", (line_id,)).fetchone()
```

- [ ] **Step 5: Rename table references in `backend/src/voice/services/line_service.py`**

- `"INSERT INTO lines (line_id, agent_id, adp_user_id, name, line_key, created_at, updated_at) "` → `"INSERT INTO voice_lines (line_id, agent_id, adp_user_id, name, line_key, created_at, updated_at) "`
- `"SELECT * FROM lines WHERE line_id=?"` → `"SELECT * FROM voice_lines WHERE line_id=?"`
- `"SELECT * FROM lines WHERE line_key=?"` → `"SELECT * FROM voice_lines WHERE line_key=?"`
- `f"SELECT * FROM lines {where} ORDER BY created_at DESC LIMIT ?"` → `f"SELECT * FROM voice_lines {where} ORDER BY created_at DESC LIMIT ?"`
- `"UPDATE lines SET name=?, status=?, updated_at=? WHERE line_id=?"` → `"UPDATE voice_lines SET name=?, status=?, updated_at=? WHERE line_id=?"`
- `"UPDATE lines SET status='revoked', updated_at=? WHERE line_id=?"` → `"UPDATE voice_lines SET status='revoked', updated_at=? WHERE line_id=?"`

- [ ] **Step 6: Rename table references in `backend/src/voice/services/call_service.py`**

- Both occurrences of `"SELECT * FROM lines WHERE line_id=?"` → `"SELECT * FROM voice_lines WHERE line_id=?"`
- Both occurrences of `"SELECT * FROM lines WHERE line_id=?", (call_row["line_id"],)` (the ones querying by `call_row["line_id"]` rather than a bare `line_id` param) → same table rename, `voice_lines`
- `"INSERT INTO calls (call_id, line_id, session_id, created_at) VALUES (?, ?, ?, ?)"` → `"INSERT INTO voice_calls (call_id, line_id, session_id, created_at) VALUES (?, ?, ?, ?)"`
- All 4 occurrences of `"SELECT * FROM calls WHERE call_id=?"` → `"SELECT * FROM voice_calls WHERE call_id=?"`
- `"UPDATE calls SET sentiment_trend_json=? WHERE call_id=?"` → `"UPDATE voice_calls SET sentiment_trend_json=? WHERE call_id=?"`
- `"UPDATE calls SET status='completed', ended_at=? WHERE call_id=?"` → `"UPDATE voice_calls SET status='completed', ended_at=? WHERE call_id=?"`
- `"UPDATE calls SET status='escalated' WHERE call_id=?"` → `"UPDATE voice_calls SET status='escalated' WHERE call_id=?"`

- [ ] **Step 7: Rename table references in `backend/src/voice/services/payment_service.py`**

- `"SELECT * FROM calls WHERE call_id=?"` → `"SELECT * FROM voice_calls WHERE call_id=?"`
- `"INSERT INTO payment_attempts (payment_id, call_id, masked_card_last4, amount, currency, status, created_at) "` → `"INSERT INTO voice_payment_attempts (payment_id, call_id, masked_card_last4, amount, currency, status, created_at) "`

- [ ] **Step 8: Verify no bare table references remain**

```bash
grep -rn "FROM lines\|INTO lines\|UPDATE lines\|FROM calls\|INTO calls\|UPDATE calls\|FROM payment_attempts\|INTO payment_attempts" backend/src/voice/
```

Expected: no output.

- [ ] **Step 9: Set Voice's db path default and repoint inter-service URLs**

In `backend/src/voice/config.py`:

```python
    voice_db_path: str = "data/platform.db"
    voice_adp_url: str = "http://localhost:8000/adp"
    voice_adp_api_key: str = "change-me"
    voice_runtime_url: str = "http://localhost:8000/runtime"
    voice_runtime_api_key: str = "change-me"
    voice_trust_url: str = "http://localhost:8000/trust"
    voice_trust_api_key: str = "change-me"
```

- [ ] **Step 10: Copy and update Voice's test suite**

```bash
mkdir -p backend/tests/voice
cp voice/tests/*.py backend/tests/voice/
```

Update `conftest.py` and any test referencing `lines`/`calls`/`payment_attempts` tables or `voice.db` to the prefixed names and `platform.db`. Update any `respx`-mocked URL for the three repointed settings.

- [ ] **Step 11: Mount Voice**

In `backend/src/backend/main.py`, add:

```python
from voice.main import app as voice_app
```

and:

```python
app.mount("/voice", voice_app)
```

- [ ] **Step 12: Run Voice's ported test suite**

```bash
cd backend
pytest tests/voice -v
```

Expected: same pass count as `voice/tests/` originally had.

- [ ] **Step 13: Boot verification**

```bash
uvicorn backend.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/voice/v1/health
sqlite3 data/platform.db ".tables"
kill %1
```

Expected: health returns `200`; `.tables` now also shows `voice_lines`, `voice_calls`, `voice_payment_attempts`.

- [ ] **Step 14: ruff check and commit**

```bash
ruff check src/voice src/backend
cd ..
git add backend/
git commit -m "Migrate Voice into backend/, tables renamed voice_*, URLs repointed, mounted at /voice"
```

---

### Task 7: Migrate Agent Runtime into `backend/`

**Files:**
- Create: `backend/src/agent_runtime/` (copied from `agent-runtime/src/agent_runtime/`, unchanged except a new health endpoint)
- Modify: `backend/src/backend/main.py` (mount `/runtime`)
- Create: `backend/tests/agent_runtime/`

**Interfaces:**
- Consumes: none — agent-runtime has no SQL schema, nothing to rename.
- Produces: `agent_runtime.api:app` mounted at `/runtime` — `GET /runtime/v1/health` (new), plus every existing route (`/runtime/v1/query`, `/runtime/v1/query/stream`, `/runtime/v1/knowledge-base/ingest`, `/runtime/query`, `/runtime/ingest`, unchanged).

- [ ] **Step 1: Copy agent-runtime's package**

```bash
cp -r agent-runtime/src/agent_runtime backend/src/agent_runtime
```

(No `migrations/` directory needed — agent-runtime has no SQL schema.)

- [ ] **Step 2: Add a health endpoint to `backend/src/agent_runtime/api.py`**

Add, right after the existing `@app.exception_handler(RuntimeError)` block and before `def create_agent():`:

```python
@app.get("/v1/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 3: Write the failing test**

```bash
mkdir -p backend/tests/agent_runtime
```

`backend/tests/agent_runtime/__init__.py` (empty), then `backend/tests/agent_runtime/test_health.py`:

```python
from fastapi.testclient import TestClient

from agent_runtime.api import app


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd backend
pytest tests/agent_runtime/test_health.py -v
```

Expected: FAIL — `404` instead of `200` (route doesn't exist yet if Step 2 wasn't done first; if Step 2 was already applied, skip straight to Step 5's verification run instead).

- [ ] **Step 5: Run test to verify it passes**

```bash
pytest tests/agent_runtime/test_health.py -v
```

Expected: PASS.

- [ ] **Step 6: Mount agent-runtime with its vector-store path set for `backend/`**

In `backend/src/backend/main.py`, add:

```python
import os

os.environ.setdefault("VECTOR_DB_PATH", "data/chroma")

from agent_runtime.api import app as runtime_app
```

(The `os.environ.setdefault` call must run *before* the `agent_runtime.api` import, since that module creates its singleton `_agent = create_agent()` at import time, reading `VECTOR_DB_PATH` immediately. Place this at the very top of `main.py`, before any other imports that might trigger it indirectly.)

and:

```python
app.mount("/runtime", runtime_app)
```

- [ ] **Step 7: Copy and run agent-runtime's existing test suite against the copied code**

```bash
cp -r agent-runtime/tests backend/tests/agent_runtime_full
cd backend
pytest tests/agent_runtime_full -v
```

Expected: same pass count as `agent-runtime/tests/` originally had. (No table renaming or path changes are needed in these tests — agent-runtime's tests don't touch a shared SQL schema, and its module name `agent_runtime` is unchanged between the standalone app and `backend/`'s copy, so the tests' existing imports resolve without edits.)

- [ ] **Step 8: Boot verification**

```bash
uvicorn backend.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/runtime/v1/health
ls data/chroma
kill %1
```

Expected: health returns `{"status":"ok"}`; `data/chroma/` exists (created on first use by ChromaDB).

- [ ] **Step 9: ruff check and commit**

```bash
ruff check src/agent_runtime src/backend
cd ..
git add backend/
git commit -m "Migrate Agent Runtime into backend/, add GET /v1/health, vector store at data/chroma, mounted at /runtime"
```

---

### Task 8: Final integration pass

**Files:** none (verification only).

**Interfaces:** none — this task only exercises what Tasks 1–7 built.

- [ ] **Step 1: Start `backend/`**

```bash
cd backend
uvicorn backend.main:app --port 8000 &
sleep 2
```

- [ ] **Step 2: Confirm the root health check and all 6 mounted health checks**

```bash
curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:8000/health
curl -s -o /dev/null -w "runtime: %{http_code}\n" http://localhost:8000/runtime/v1/health
curl -s -o /dev/null -w "adp: %{http_code}\n" http://localhost:8000/adp/v1/health
curl -s -o /dev/null -w "channels: %{http_code}\n" http://localhost:8000/channels/v1/health
curl -s -o /dev/null -w "trust: %{http_code}\n" http://localhost:8000/trust/v1/health
curl -s -o /dev/null -w "expert-answers: %{http_code}\n" http://localhost:8000/expert-answers/v1/health
curl -s -o /dev/null -w "voice: %{http_code}\n" http://localhost:8000/voice/v1/health
```

Expected: `200` for all 7.

- [ ] **Step 3: Confirm the shared database has every product's prefixed tables**

```bash
sqlite3 data/platform.db ".tables"
```

Expected output includes: `adp_users`, `adp_sessions`, `adp_messages`, `trust_audit_log`, `channels_channels`, `channels_channel_stats`, `expert_answers_resolutions`, `expert_answers_knowledge_articles`, `voice_lines`, `voice_calls`, `voice_payment_attempts`. No bare (unprefixed) table names.

- [ ] **Step 4: Exercise a write + read on ADP to prove the renamed-table queries work end-to-end**

```bash
curl -s -X POST http://localhost:8000/adp/v1/users \
  -H "Authorization: Bearer change-me" -H "Content-Type: application/json" \
  -d '{"external_id":"integration-test","display_name":"Integration Test User"}'
curl -s http://localhost:8000/adp/v1/stats -H "Authorization: Bearer change-me"
```

Expected: the create call returns the new user with a `user_id`; `/v1/stats` reflects `"users": 1` (or more, if run repeatedly).

- [ ] **Step 5: Exercise one cross-service call to confirm the repointed URL resolves**

Create a channel (which stores `channels_adp_url` internally but doesn't call it until a chat flow needs ADP context) — at minimum, confirm the setting itself resolves correctly by checking the mounted Channels app's resolved config value matches the unified base, since a full chat-flow test depends on Ghostwriter/Agent Studio data not in scope here:

```bash
python3 -c "
import sys
sys.path.insert(0, 'src')
from channels.config import get_settings
s = get_settings()
assert s.channels_adp_url == 'http://localhost:8000/adp', s.channels_adp_url
assert s.channels_runtime_url == 'http://localhost:8000/runtime', s.channels_runtime_url
assert s.channels_trust_url == 'http://localhost:8000/trust', s.channels_trust_url
print('channels URLs OK')
"
```

Expected: `channels URLs OK` (no assertion error).

- [ ] **Step 6: Confirm all 6 standalone apps still run and still work, untouched**

```bash
cd ..
for dir_port in "agent-runtime:8001" "agent-data-platform:8100" "channels:8200" "trust:8500" "expert-answers:8600" "voice:8700"; do
  dir="${dir_port%%:*}"; port="${dir_port##*:}"
  cd "$dir"
  source .venv/bin/activate
  uvicorn "$(echo $dir | tr '-' '_' | sed 's/agent_data_platform/adp/').main:app" --port "$port" &
  cd ..
done
sleep 3
curl -s -o /dev/null -w "agent-runtime :8001: %{http_code}\n" http://localhost:8001/v1/query 2>/dev/null || true
curl -s -o /dev/null -w "adp :8100: %{http_code}\n" http://localhost:8100/v1/health
curl -s -o /dev/null -w "channels :8200: %{http_code}\n" http://localhost:8200/v1/health
curl -s -o /dev/null -w "trust :8500: %{http_code}\n" http://localhost:8500/v1/health
curl -s -o /dev/null -w "expert-answers :8600: %{http_code}\n" http://localhost:8600/v1/health
curl -s -o /dev/null -w "voice :8700: %{http_code}\n" http://localhost:8700/v1/health
```

Expected: `200` for the 5 with a `/v1/health` endpoint (agent-runtime's standalone app has no health endpoint, per Task 7 — a non-404 response, or a 405/422 rather than connection-refused, is sufficient to prove it's up).

- [ ] **Step 7: Tear down**

```bash
pkill -f "uvicorn backend.main:app"
pkill -f "uvicorn.*--port 800[0-9]"
pkill -f "uvicorn.*--port 8[1-7]00"
```

- [ ] **Step 8: Record progress**

Append a summary of this pass to `.superpowers/sdd/progress.md` under a new "# Unified Backend Process" section, following the same format as the "# Unified Platform Shell" section: which checks passed, any deviations, anything left for a follow-up spec (retiring the 6 standalone apps; repointing the standalone apps' own settings; the other open questions from spec §8).

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "Final integration verification: all 6 backends mounted, shared db confirmed, standalone apps unaffected"
```
