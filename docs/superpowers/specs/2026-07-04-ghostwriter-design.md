# Product Spec: Ghostwriter (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

Agent Runtime can answer questions grounded in a knowledge base — but there is no
product for creating or maintaining that knowledge base. Today, loading documents
requires running a Python ingestion script directly against the file system. A support
manager cannot add a new policy doc, update a pricing page, or see what's currently
in the knowledge base without engineering help. Ghostwriter fills this gap: it is the
authoring interface for the content that agents use to answer questions.

---

## 2. Goals (v1)

- G1: Let a user create, edit, and delete knowledge articles through a web UI — no
  code required.
- G2: Automatically ingest every saved article into Agent Runtime's vector + BM25
  index so agents can retrieve it immediately.
- G3: Let a user see all articles currently in the knowledge base, with status
  (indexed / pending / error).
- G4: Let a user search the knowledge base by keyword to verify content before
  publishing.
- G5: Expose the same operations as a REST API so articles can be managed
  programmatically (CI/CD pipelines, bulk import).

---

## 3. Non-Goals (explicitly out of scope for v1)

- No rich-text / WYSIWYG editor — plain text and Markdown only.
- No versioning or change history for articles.
- No approval workflow or draft/publish states — saved = live.
- No file upload (PDF, DOCX) — plain text content via UI or API only.
- No multi-collection or multi-agent-runtime support — one Runtime, one index.
- No AI-assisted writing or autocomplete.
- No article tagging, categorization, or custom metadata beyond `title` and `source_id`.
- No access control beyond the single admin API key.

---

## 4. Users

**Primary — the knowledge author:** a support manager, ops lead, or content writer who
owns the information agents use. Creates and maintains articles via the web UI. Does
not write code or run scripts.

**Secondary — the developer / CI pipeline:** uses the REST API to bulk-import or
update articles from an external CMS or docs repo.

---

## 5. Functional Requirements

### FR-1: Article management (REST API)

- FR-1.1 Create article: `POST /v1/articles` — body: `{ title, content, source_id? }`.
  `source_id` is an optional external identifier (e.g. a CMS slug) for idempotent
  upserts. Returns article object with `article_id` and `status: "pending"`.
- FR-1.2 List articles: `GET /v1/articles` — paginated, filterable by `status`.
  Returns `{ items, next_cursor }`.
- FR-1.3 Get article: `GET /v1/articles/{article_id}`.
- FR-1.4 Update article: `PATCH /v1/articles/{article_id}` — body: `{ title?, content? }`.
  Sets `status` back to `"pending"` (triggers re-ingestion).
- FR-1.5 Delete article: `DELETE /v1/articles/{article_id}` — removes from DB and
  triggers removal from Agent Runtime index.
- FR-1.6 Upsert by source_id: `PUT /v1/articles/by-source-id/{source_id}` — creates
  if not exists, updates if exists. Idempotent. Used by CI pipelines.
- FR-1.7 Search articles: `GET /v1/articles/search?q=...` — keyword search over title
  and content, case-insensitive, paginated.

### FR-2: Ingestion pipeline

- FR-2.1 On every create or update, Ghostwriter calls Agent Runtime's ingest endpoint
  to load the article's content into the vector + BM25 index.
- FR-2.2 `status` field reflects ingestion state:
  - `"pending"` — saved, ingest not yet attempted or in progress.
  - `"indexed"` — successfully ingested into Agent Runtime.
  - `"error"` — last ingestion attempt failed; `error_detail` field explains why.
- FR-2.3 Ingestion is synchronous in v1 (inline on the POST/PATCH request). If Agent
  Runtime is unavailable, the article is saved with `status: "error"` and the error
  stored — the article is never lost.
- FR-2.4 `POST /v1/articles/{article_id}/reindex` — manually retry ingestion for an
  article in `"error"` state.
- FR-2.5 On delete, Ghostwriter calls Agent Runtime to remove the article's chunks
  from the index. If the Runtime call fails, the article is still deleted from the
  Ghostwriter DB and the error is logged (best-effort cleanup).

### FR-3: Web UI

- FR-3.1 Article list page (`/`) — table of all articles showing title, status badge,
  word count, last updated. Filterable by status. Paginated (20 per page).
- FR-3.2 New article page (`/articles/new`) — form with title field and content
  textarea. "Save & index" button submits to the API and redirects to the detail page.
- FR-3.3 Edit article page (`/articles/{id}/edit`) — pre-populated form. "Save &
  reindex" button. "Delete" button with confirmation.
- FR-3.4 Article detail page (`/articles/{id}`) — read-only view: title, status badge
  (with error message if status is `"error"`), content preview (first 500 chars),
  word count, created/updated timestamps. "Edit" and "Reindex" actions.
- FR-3.5 Search page (`/search`) — keyword search box, results list with title +
  content snippet. Linked to article detail.
- FR-3.6 All pages share a nav: "Articles", "Search", product wordmark.

### FR-4: Auth

- FR-4.1 All REST endpoints require `X-API-Key` header.
- FR-4.2 Web UI pages are served without auth (local dev only; v1 non-goal is auth for
  the UI).
- FR-4.3 The key used by Ghostwriter to call Agent Runtime is a separate env var
  (`GHOSTWRITER_RUNTIME_API_KEY`) — not the same as the admin key.

---

## 6. Technical Architecture

```
Browser
  └─ Ghostwriter UI  (Next.js App Router, served by Ghostwriter service)
       │  fetch
       ▼
Ghostwriter Service  (Next.js API routes, port 8300)
  ├─ Article store (SQLite)          ← titles, content, status, source_ids
  └─ → Agent Runtime (port 8001)     ← ingest / delete from index
```

Ghostwriter does **not** run its own embedding or chunking. It delegates ingestion
entirely to Agent Runtime's existing ingest endpoint. This means:

- No new ML dependencies in Ghostwriter.
- Agent Runtime's chunking and indexing logic is the single source of truth.
- If chunking strategy changes, Ghostwriter benefits automatically.

### Ingestion call (FR-2.1)

```
POST http://localhost:8001/ingest
Body: { "documents": [{ "content": "<article content>", "source": "<article_id>" }] }
```

Agent Runtime's ingest endpoint already exists (built in M1 of Agent Runtime). 
Ghostwriter uses `source` = `article_id` so chunks can be looked up and removed later.

### Deletion call (FR-2.5)

Agent Runtime v1 does not expose a delete endpoint. Ghostwriter will call
`POST /ingest` with empty content for the same source_id as a best-effort no-op,
and log that true index removal is deferred to Agent Runtime v1.1.
(This is documented as OQ-1 below.)

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language / framework | Next.js 14 (App Router) + TypeScript | Same as Agent Studio — one runtime, shared tooling |
| Database | SQLite via `better-sqlite3` | Same as Agent Studio |
| HTTP client (outbound) | `fetch` (Node built-in) | Calling Agent Runtime from API routes |
| UI | Tailwind CSS | Same token system as Agent Studio |
| Testing | Vitest | Same as Agent Studio |
| Lint | next lint + tsc --noEmit | Same as Agent Studio |

**Why Next.js, not FastAPI?**
Ghostwriter has a substantial web UI (FR-3). Keeping it in the same stack as Agent
Studio (Next.js + TypeScript + Tailwind) means one runtime to start, shared component
patterns, and consistent visual language — not a new Python service with a separate
frontend build.

---

## 8. Data Models

### SQL schema (`ghostwriter/migrations/001_initial_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS articles (
    article_id   TEXT PRIMARY KEY,
    source_id    TEXT UNIQUE,           -- optional external identifier
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK(status IN ('pending','indexed','error')),
    error_detail TEXT,
    word_count   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_status    ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_updated   ON articles(updated_at);
```

### TypeScript types

```typescript
type ArticleStatus = 'pending' | 'indexed' | 'error'

interface Article {
  article_id: string
  source_id: string | null
  title: string
  content: string
  status: ArticleStatus
  error_detail: string | null
  word_count: number
  created_at: string
  updated_at: string
}

interface ArticleCreate {
  title: string
  content: string
  source_id?: string
}

interface ArticleUpdate {
  title?: string
  content?: string
}
```

---

## 9. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/articles` | X-API-Key | Create article |
| `GET` | `/api/articles` | X-API-Key | List articles (paginated) |
| `GET` | `/api/articles/search` | X-API-Key | Keyword search |
| `GET` | `/api/articles/{id}` | X-API-Key | Get article |
| `PATCH` | `/api/articles/{id}` | X-API-Key | Update article |
| `DELETE` | `/api/articles/{id}` | X-API-Key | Delete article |
| `PUT` | `/api/articles/by-source-id/{sid}` | X-API-Key | Upsert by source_id |
| `POST` | `/api/articles/{id}/reindex` | X-API-Key | Retry ingestion |
| `GET` | `/api/health` | X-API-Key | Health check |
| `GET` | `/api/stats` | X-API-Key | Article counts by status |

All errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`
All list responses: `{ "items": [...], "next_cursor": "..." }`

---

## 10. Repo Structure

```
ghostwriter/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── app/
│       ├── layout.tsx           ← shared nav + Tailwind base
│       ├── page.tsx             ← article list (/)
│       ├── articles/
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx     ← article detail
│       │       └── edit/
│       │           └── page.tsx
│       ├── search/
│       │   └── page.tsx
│       └── api/
│           ├── health/
│           │   └── route.ts
│           ├── stats/
│           │   └── route.ts
│           └── articles/
│               ├── route.ts                       ← POST, GET list
│               ├── search/
│               │   └── route.ts
│               ├── by-source-id/
│               │   └── [source_id]/
│               │       └── route.ts               ← PUT upsert
│               └── [id]/
│                   ├── route.ts                   ← GET, PATCH, DELETE
│                   └── reindex/
│                       └── route.ts               ← POST reindex
├── lib/
│   ├── db.ts                    ← better-sqlite3 singleton + migrations
│   ├── articles.ts              ← article CRUD functions
│   ├── ingestion.ts             ← calls Agent Runtime ingest/delete
│   └── auth.ts                  ← X-API-Key check helper
├── tests/
│   ├── articles.test.ts
│   ├── ingestion.test.ts
│   └── integration.test.ts
├── data/
│   └── .gitkeep
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── .env.local.example
└── .gitignore
```

---

## 11. Milestones

### M1: Scaffold + DB + Health

Create directory, `package.json`, `next.config.js`, `tailwind.config.ts`,
`tsconfig.json`, migrations, `lib/db.ts`, `lib/auth.ts`, `app/api/health/route.ts`.

**Done when:** `GET /api/health` returns `{"status":"ok","database":"connected"}`.
Missing/wrong key → 401. `npm test` + `next lint` + `tsc --noEmit` clean.

### M2: Article CRUD (API only)

`lib/articles.ts`, `app/api/articles/route.ts`, `app/api/articles/[id]/route.ts`,
`app/api/articles/by-source-id/[source_id]/route.ts`, `app/api/stats/route.ts`.
No ingestion yet — status stays `"pending"`.

**Done when:** Create, list, get, update, delete, upsert all pass. Pagination works.
Search endpoint returns keyword matches. `npm test` clean.

### M3: Ingestion pipeline

`lib/ingestion.ts`, wire into create/update/delete routes, `reindex` route.

Agent Runtime calls are mocked in tests (fetch mock via `vitest`).

**Done when:** Creating or updating an article calls the Runtime ingest mock and sets
`status: "indexed"`. Runtime failure sets `status: "error"` with `error_detail`.
Reindex retries and updates status. `npm test` clean.

### M4: Web UI

`app/layout.tsx`, `app/page.tsx`, `app/articles/new/page.tsx`,
`app/articles/[id]/page.tsx`, `app/articles/[id]/edit/page.tsx`,
`app/search/page.tsx`.

UI-specific Definition of Done (Part 8) applies:
- Design plan (tokens, layout, signature) reviewed before build.
- Screenshot self-review; at least one element cut for restraint.
- Keyboard-accessible; status badges visually distinct.
- Copy: active-voice labels ("Save & index", "Delete article", not "Submit"/"OK").
- Consistent with Agent Studio's token system (same color variables and type scale).

**Done when:** All pages render, form submissions work end-to-end, status badge shows
correct state. `next lint` + `tsc --noEmit` clean.

### M5: Integration test

`tests/integration.test.ts` — full lifecycle: create article → verify indexed →
update → verify re-indexed → search → delete → verify gone.

**Done when:** All steps pass. `npm test` + `next lint` + `tsc --noEmit` clean.

---

## 12. Acceptance Criteria (v1 overall)

1. `npm run dev` starts the service; DB created and migrations run on first request.
2. Articles can be created, listed, searched, updated, and deleted via the REST API.
3. Creating or updating an article triggers Agent Runtime ingestion; status reflects
   the result.
4. A failed ingestion sets `status: "error"` with an explanation; the article is
   never lost.
5. `POST /api/articles/{id}/reindex` retries a failed ingestion.
6. `PUT /api/articles/by-source-id/{sid}` is idempotent — calling it twice with the
   same content does not create a duplicate.
7. All REST errors follow `{ "error": { "code": "...", "message": "...", "details": {} } }`.
8. All list responses follow `{ "items": [...], "next_cursor": "..." }`.
9. The web UI renders all pages and allows create/edit/delete without writing code.
10. `npm test`, `next lint`, and `tsc --noEmit` pass with zero errors.

---

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| Article save latency (p95, excl. Runtime ingest) | < 30ms | Single SQLite write |
| Article list latency (p99) | < 40ms | Indexed SQLite query |
| Search latency (p99) | < 80ms | LIKE on content; acceptable for editorial tool |
| Runtime ingest call | 1 per save | No multiplied calls; chunking is Runtime's job |
| External calls per delete | 1 (best-effort Runtime call) | May fail gracefully |

---

## 14. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Ghostwriter compliance |
|---|---|
| Error shape `{"error":{"code":"...","message":"...","details":{}}}` | Shared `apiError()` helper in `lib/auth.ts` |
| REST versioning `/v1/...` | Uses `/api/...` (Next.js convention); internally equivalent to `/v1` |
| Auth header `X-API-Key` | Yes, checked in every API route |
| List responses `{"items":[...],"next_cursor":"..."}` | Yes |
| SQLite for local storage | Yes, `ghostwriter/data/ghostwriter.db` |
| Tailwind + same token system as Agent Studio | Yes — shares color variable names |

Note: Next.js API routes use `/api/` prefix by convention rather than `/v1/`. This is
consistent with Agent Studio's own API routes and acceptable for a UI-first product.
Channels and ADP use `/v1/` because they are pure API services.

---

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `GHOSTWRITER_API_KEY` | Yes | `change-me` | Admin API key |
| `GHOSTWRITER_DB_PATH` | No | `data/ghostwriter.db` | SQLite path |
| `GHOSTWRITER_PORT` | No | `8300` | Dev server port |
| `GHOSTWRITER_RUNTIME_URL` | No | `http://localhost:8001` | Agent Runtime base URL |
| `GHOSTWRITER_RUNTIME_API_KEY` | Yes | — | Key to authenticate with Agent Runtime |

---

## 16. Open Questions

- OQ-1: Agent Runtime v1 has no delete-by-source endpoint. Ghostwriter v1 cannot
  truly remove deleted articles from the vector index. Resolution: document this gap;
  implement true deletion in Agent Runtime v1.1. For v1, Ghostwriter deletes from its
  own DB and logs a warning.
- OQ-2: Should Ghostwriter support Markdown rendering in the article detail view?
  Useful for authors; not critical for v1. Deferred — plain text preview is sufficient.
- OQ-3: Word count is computed at save time (`content.split(/\s+/).length`). Should
  it be token count instead? Token count is more useful for debugging context budget
  issues. Deferred to v1.1 — word count is a good enough proxy for v1.
- OQ-4: Should the `/api` prefix be changed to `/v1` for consistency with other
  products? Risk: breaks Next.js App Router conventions. Decision: keep `/api` for
  Next.js products (Studio + Ghostwriter), use `/v1` for pure-API products (ADP,
  Channels, Trust). Document this split in the playbook glossary.
