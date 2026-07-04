# Expert Answers UI — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-expert-answers-ui-design.md`
Location: `expert-answers/ui/` (new Next.js app, port 8601)
Commit prefix: `[expert-answers-ui]`

**Claimed 2026-07-04 — picked from the Agent B bucket in CLAUDE.md's phase-2
split (unclaimed at claim time; Agent A bucket is fully covered). No
collision: `expert-answers/ui` doesn't exist yet, no plan file for it exists.**

## Grounding against the real (not spec-imagined) APIs

- `design-system` exports: same verified API as Channels/Voice UI —
  `AppShell`, `Button`, `Card`, `Table` (no `onRowClick`; use a `Link` inside a
  column's `render` for navigation — this was a real bug in the first draft
  of Channels UI, now fixed there too), `Badge`, `Input`, `Select`, `Modal`,
  `useToast`, `EmptyState`, `MetricCard`.
- Expert Answers backend (verified from
  `expert-answers/src/expert_answers/routes/*.py` and `models/*.py`):
  - `POST /v1/resolutions` — body `{ conversation_id, transcript?,
    adp_session_id?, resolution_note, topic? }` (exactly one of
    transcript/adp_session_id, enforced server-side) → `{ resolution,
    article }` (article is `null` if draft generation failed).
  - `POST /v1/resolutions/{id}/retry` → `{ resolution, article }`.
  - `GET /v1/articles?status=&topic=` → `{ items, next_cursor }`.
  - `GET /v1/articles/{id}` → `ArticleResponse`.
  - `PATCH /v1/articles/{id}` — body `{ title?, body?, status? }`, status one
    of `approved|rejected|published` → updated article, or 400
    `invalid_transition` if the transition isn't allowed.
  - `GET /v1/articles/published?topic=` → `{ items, next_cursor }`.
  - Auth: `X-API-Key` on every endpoint (no public/anonymous surface, unlike
    Channels/Voice).
  - Port 8600.

## Status

- [ ] M1: Scaffold `expert-answers/ui` (Next.js app, port 8601, design-system
      wired in, add to root workspaces array)
- [ ] M2: Submit-resolution form + article queue list (with status/topic
      filters)
- [ ] M3: Article review page (approve/reject/publish) + failed-draft retry
