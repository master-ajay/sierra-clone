# Product Spec: Expert Answers UI (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1
Depends on: Design System (`2026-07-04-design-system-design.md`) must be merged first.

---

## 1. Problem Statement

Expert Answers (`expert-answers/`, port 8600) is API-only today. Its core workflow —
a care rep reviewing, editing, and approving/rejecting AI-drafted knowledge articles
— is exactly the kind of task that needs a UI, not a raw API. This spec adds the
review console, built on `design-system` from day one.

---

## 2. Goals (v1)

- G1: Submit a resolution (transcript or ADP session reference + resolution note).
- G2: List and filter articles by status (`pending_review`, `published`,
  `rejected`) and topic.
- G3: Review a draft article — see its source transcript excerpt, edit title/body,
  approve/reject/publish.
- G4: Use `AppShell` with this product's own nav.

---

## 3. Non-Goals

- No topic-discovery or trend UI — that's Insights/Explorer's job.
- No automatic notification/webhook UI for new resolutions — this is a pull-based
  review queue, not a live alerting system.

---

## 4. Functional Requirements

### FR-1: Submit resolution (`/resolutions/new`)

- FR-1.1 Form: `conversation_id` `Input`, toggle between pasting a transcript
  (textarea) or an `adp_session_id` `Input`, `resolution_note` textarea, optional
  `topic` `Input`. Calls `POST /v1/resolutions`.

### FR-2: Article queue (`/`)

- FR-2.1 `Table` of articles with `Badge` for status, filterable by status/topic
  (`Select`s driving `GET /v1/articles?status=&topic=`). `EmptyState` when empty.

### FR-3: Article review (`/articles/[id]`)

- FR-3.1 `Card` showing title, body (editable via `Input`/textarea), cited excerpt
  (read-only, in a distinct visual block so it's clear it's quoted source material,
  not editable prose), and source resolution link.
- FR-3.2 Approve / Reject / Publish `Button`s calling `PATCH /v1/articles/{id}` with
  the appropriate status transition; disabled for invalid transitions (e.g. no
  "Publish" button shown until status is `approved`). Success shows a `Toast`.

### FR-4: Failed drafts

- FR-4.1 Resolutions with status `draft_failed` show in a distinct filtered view
  with a "Retry" `Button` (`POST /v1/resolutions/{id}/retry`).

---

## 5. Technical Architecture

```
expert-answers/ui/      (new Next.js app, port 8601)
  → Expert Answers backend (port 8600) only — no other product dependency
```

---

## 6. Repo Structure

```
expert-answers/ui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    ← article queue
│   ├── resolutions/new/page.tsx
│   └── articles/[id]/page.tsx
├── lib/api.ts
├── package.json  (dev script: next dev -p 8601)
├── tailwind.config.ts               ← extends design-system preset
└── ...standard Next.js config files
```

---

## 7. Milestones

### M1: Scaffold
**Done when:** `expert-answers/ui` builds and runs on port 8601 with `design-system`
wired in.

### M2: Submit resolution
**Done when:** Form submits either transcript or ADP-session-reference path
end-to-end against the running backend.

### M3: Article queue + filters
**Done when:** List renders with status/topic filters working.

### M4: Article review + retry
**Done when:** Approve/reject/publish transitions and failed-draft retry all work
end-to-end.

---

## 8. Acceptance Criteria

1. All pages built with `design-system` components only.
2. Full lifecycle (submit resolution → draft appears → review → approve → publish)
   works against the real Expert Answers backend running locally.
3. `npm test`, `npm run lint`, `npm run typecheck` pass.

---

## 9. Open Questions

None — this UI's scope is fully determined by the existing Expert Answers API
surface.
