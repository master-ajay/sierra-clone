# Ghostwriter — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-ghostwriter-design.md`
Location: `ghostwriter/` subdirectory (Next.js 14, TypeScript, Tailwind, SQLite)
Port: 8300
Commit prefix: `[ghostwriter]`

## Status

- [ ] Task 0: Scaffold
- [ ] Task 1 / M1: Scaffold + DB + Health
- [ ] Task 2 / M2: Article CRUD (API only)
- [ ] Task 3 / M3: Ingestion pipeline
- [ ] Task 4 / M4: Web UI
- [ ] Task 5 / M5: Integration tests

---

### Task 0: Scaffold
Directory layout, package.json, next.config.js, tailwind, tsconfig, migrations.

### Task 1 / M1: Scaffold + DB + Health
`lib/db.ts`, `lib/auth.ts`, `app/api/health/route.ts`.
Done when: GET /api/health → 200. Missing/wrong key → 401. npm test + lint + typecheck clean.

### Task 2 / M2: Article CRUD
`lib/articles.ts`, all article API routes, search route, stats route.
No ingestion yet — status stays "pending".
Done when: all CRUD + search + upsert pass. npm test clean.

### Task 3 / M3: Ingestion pipeline
`lib/ingestion.ts`, wire into create/update/delete/reindex routes.
Runtime calls mocked in tests.
Done when: create/update triggers ingest mock → "indexed". Failure → "error". Reindex works.

### Task 4 / M4: Web UI
All page components. Design plan first (Part 8).
Done when: all pages render, forms work end-to-end. lint + typecheck clean.

### Task 5 / M5: Integration test
Full lifecycle: create → indexed → update → re-indexed → search → delete → gone.
Done when: npm test + lint + typecheck clean. Commit.
