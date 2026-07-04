# Product Spec: Ghostwriter UI Rebuild (v2)

Spec date: 2026-07-04
Status: Awaiting Gate 1
Depends on: Design System (`2026-07-04-design-system-design.md`) must be merged first.

---

## 1. Problem Statement

Ghostwriter's current UI (`ghostwriter/src/app/{page,search,articles}`) predates the
shared design system. It is being discarded and rebuilt on `design-system` so it
matches the rest of the platform, using its existing API routes
(`/api/articles`, `/api/articles/search`, `/api/stats`, `/api/articles/[id]`,
`/api/articles/[id]/reindex`) unchanged.

---

## 2. Goals (v1)

- G1: Delete existing page code, rebuild the same functional surface (article list,
  article detail/edit, new article, search, stats) on `design-system`.
- G2: No functional regression against the existing API routes.
- G3: Use `AppShell` as the page frame.

---

## 3. Non-Goals

- No new features — visual rebuild only.
- No change to `ghostwriter/src/app/api/**`.

---

## 4. Functional Requirements

### FR-1: Delete and scaffold

- FR-1.1 Delete `ghostwriter/src/app/{page.tsx,search,articles}`, keep `api/**`.
- FR-1.2 Add `design-system` dependency; update Tailwind config to the shared preset.

### FR-2: Article list / home (`/`)

- FR-2.1 `MetricCard` row from `/api/stats` (total articles, etc. — whatever that
  endpoint returns today). `Table` of articles below with a search `Input` linking
  to `/search`. `EmptyState` when no articles exist.

### FR-3: Search (`/search`)

- FR-3.1 Search input + results `Table`, calling the existing
  `/api/articles/search` route unchanged.

### FR-4: New article (`/articles/new`)

- FR-4.1 Form (`Input`/`Card`) posting to the existing article-creation route.

### FR-5: Article detail / edit (`/articles/[id]`, `/articles/[id]/edit`)

- FR-5.1 Detail view in a `Card`; edit form reusing the same fields as today.
  "Reindex" action calls the existing `/api/articles/[id]/reindex` route and shows a
  success `Toast`.

---

## 5. Milestones

### M1: Delete + scaffold
**Done when:** App builds with an empty home route inside `AppShell`.

### M2: Article list + stats
**Done when:** Home page shows `MetricCard`s from `/api/stats` and an article
`Table`, `EmptyState` when empty.

### M3: Search
**Done when:** `/search` returns and renders results from the existing endpoint.

### M4: New + edit + reindex
**Done when:** Create, edit, and reindex all work end-to-end against existing
routes, with `Toast` confirmations.

---

## 6. Acceptance Criteria

1. All pages rebuilt using only `design-system` components.
2. Every existing action (create, search, edit, reindex) still works identically.
3. `npm test`, `npm run lint`, `npm run typecheck` pass.

---

## 7. Open Questions

- OQ-1: None beyond what's already covered — this is a contained visual rebuild.
