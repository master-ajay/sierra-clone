# Ghostwriter UI Rebuild — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-ghostwriter-ui-design.md`
Location: `ghostwriter/src/app/*` (existing Next.js app, port 8300)
Commit prefix: `[ghostwriter-ui]`

**Claimed 2026-07-04 — from the Agent B bucket (Insights/Explorer already
claimed by the other agent; Trust still open, picking this one). No
collision: `ghostwriter/src/app/{page.tsx,search,articles}` is the target for
deletion+rebuild, and nobody else has touched it since the last commit.**

## Key architectural difference from Channels/Voice/Expert-Answers UI

Ghostwriter is **one Next.js app with both API routes and UI pages in the same
process** (`ghostwriter/src/app/api/**` + `ghostwriter/src/app/{page,search,
articles}`), unlike Channels/Voice/Expert Answers, which are separate FastAPI
services fronted by a new Next.js app. Ghostwriter's existing API routes
(`checkApiKey` in `lib/auth.ts`) require `X-API-Key` on **every** call,
including from its own UI — there is no session/cookie exemption for
same-origin requests.

Proxying through those routes from client components would require embedding
`GHOSTWRITER_API_KEY` in browser-visible code, which is the same key-exposure
problem the other three products' UIs were built to avoid via a server-side
proxy layer. Since this is one app, the cleaner fix (and what actually avoids
exposing the key) is: **UI pages call the underlying `lib/articles.ts` /
`lib/ingestion.ts` functions directly from Server Components and Server
Actions**, never through the HTTP-layer API routes at all. This changes zero
lines in `ghostwriter/src/app/api/**` (spec non-goal preserved) and needs no
new proxy routes, because there's no second server to proxy to.

## Grounding against the real (not spec-imagined) API/lib surface

- `lib/articles.ts` exports: `createArticle`, `getArticle`,
  `getArticleBySourceId`, `listArticles`, `updateArticle`, `deleteArticle`,
  `upsertBySourceId`, `setArticleStatus`, `searchArticles`.
- `Article = { article_id, source_id, title, content, status:
  'pending'|'indexed'|'error', error_detail, word_count, created_at,
  updated_at }`.
- `lib/ingestion.ts` exports `ingestArticle(id, content)` — used by both
  create and the reindex action.
- Stats: `GET /api/stats` route already computes `{ total, by_status: {
  indexed, pending, error } }` from raw SQL — the UI can call this same
  logic directly via a new tiny server-side helper, or just re-read via
  `getDb()` in a Server Component; either is fine since it's read-only and
  in-process.
- `design-system` exports: same verified API as the other three UIs —
  `AppShell`, `Button`, `Card`, `Table` (render-based Link navigation, not
  `onRowClick`), `Badge`, `Input`, `MetricCard`, `EmptyState`, `useToast`.

## Status

- [ ] M1: Delete `ghostwriter/src/app/{page.tsx,search,articles}`; scaffold
      `AppShell`-wrapped empty home page on design-system
- [ ] M2: Article list/home (stats + table) + search page
- [ ] M3: New article + article detail/edit + reindex (via Server Actions)
