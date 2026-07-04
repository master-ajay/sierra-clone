# Product Spec: Unified Platform Shell (Phase 1) + Agent Studio Pilot Migration (Phase 2)

Spec date: 2026-07-05
Status: Awaiting Gate 1
Depends on: none (Design System is done and merged; this spec deliberately does not
depend on it — see §5).

---

## 1. Problem Statement

Every product in this repo is a separately deployed Next.js (or Python) service on
its own port, discovered only by knowing the port number. `next-shadcn-admin-dashboard-main/`
was vendored (commit 281db49) as "the basis for the planned UI consolidation" but no
spec or plan exists yet for what that consolidation actually is. This spec defines it:
a single shell app that becomes the one entry point into the platform, plus a pilot
migration of one product (Agent Studio) into it to validate the pattern before
repeating it for the other six.

This is intentionally split into two phases in one spec (not two specs) because
Phase 2 is the acceptance test for Phase 1 — a shell with nothing running inside it
doesn't prove the pattern works.

---

## 2. Goals (v1)

- G1: A single running app (`platform/`) with a sidebar listing all 7 products,
  a Sierra-themed (forest-green/cream) light+dark shell, replacing the template's
  generic neutral/tangerine/etc. presets.
- G2: All 7 sidebar entries resolve to something today — either an external link to
  the product's existing standalone deployment, or (Agent Studio only) an in-shell
  route.
- G3: Agent Studio's agent list, agent editor, and playground pages and their
  backing API routes run inside `platform/` at `/agent-studio/*` and
  `/api/agent-studio/*`, functionally identical to the current root-level app.
- G4: The existing root-level Agent Studio app (`app/`, port 3000) keeps running
  unmodified and undeleted through this spec — retiring it is a follow-up decision,
  not part of this work.

---

## 3. Non-Goals

- No migration of Ghostwriter, Explorer, Trust, Channels, Expert Answers, or Voice
  into the shell — they stay linked externally. Each gets its own future spec,
  following the pattern this one establishes.
- No retiring/deleting the root-level Agent Studio app.
- No auth/RBAC wiring, even though the vendored template ships auth screens we keep.
- No use of the template's non-shell demo dashboards (CRM, finance, ecommerce,
  kanban, mail, academy, invoice, logistics, analytics, productivity, calendar,
  tasks, roles, users, coming-soon) — all deleted in Phase 1.
- No attempt to reconcile the shell's dependency stack (Next 16 / React 19 /
  Tailwind v4) with the rest of the monorepo (Next 14.2 / React 18.3 / Tailwind v3).
  They coexist as independent workspace packages, same as any two products already do.

---

## 4. Functional Requirements

### FR-1: Shell scaffold

- FR-1.1 New workspace member `platform/`, forked from
  `next-shadcn-admin-dashboard-main/`, added to the root `package.json` workspaces
  array. Dev script runs on port 3999 (`next dev -p 3999`) — the only unclaimed port
  in the platform's numbering (3000, 8001, 8100, 8200/8201, 8300, 8400, 8500/8501,
  8600/8601, 8700/8701 are all taken).
- FR-1.2 Delete every route group/page under `src/app/(main)/dashboard/*` except
  keep the folder structure needed for one blank `default` landing page, delete
  `src/app/(main)/chat/*` and `src/app/(main)/mail/*` (demo content, not Channels —
  don't confuse the template's own "chat" demo with the real Channels product).
  Keep `src/app/(main)/auth/*` and `src/app/(main)/unauthorized/*` as-is (unused
  today, harmless, saves reintroducing them later).
- FR-1.3 Sidebar nav config lists exactly 7 entries: Agent Studio, Ghostwriter,
  Explorer, Trust & Reliability, Channels, Expert Answers, Voice. Only Agent
  Studio's entry is an in-shell `<Link href="/agent-studio">`; the other 6 are
  `<a href="http://localhost:{port}">` external links (Ghostwriter :8300,
  Explorer :8400, Trust :8501, Channels :8201, Expert Answers :8601, Voice :8701).

### FR-2: Sierra theme

- FR-2.1 Replace the template's theme presets (neutral/tangerine/brutalist/soft-pop)
  with one Sierra theme defined as Tailwind v4 CSS variables in `globals.css`,
  values ported from `design-system/tokens.js`: brand primary `#1B4332`, bg base
  `#F5F1E8`, bg surface `#FFFFFF`, text primary `#1F2422`, text muted `#5B6560`,
  border `#DEDACD`, status success/warning/error/info as already defined. Inter
  font, same as every other product.
- FR-2.2 Both light and dark variants defined (the template's existing
  light/dark toggle mechanism is kept; only the color values change).
- FR-2.3 Remove the theme-preset switcher UI control (no more Tangerine/Brutalist
  choice — Sierra has one brand, not a chooser).

### FR-3: Agent Studio pilot migration

- FR-3.1 Copy `app/agents/*` (pages), `app/api/*` (route handlers), and `lib/*`
  (db, chat engine, groq client, tools) from repo root into
  `platform/src/app/agent-studio/*` and `platform/src/lib/agent-studio/*`
  respectively. Update internal imports and fetch URLs from `/api/*` to
  `/api/agent-studio/*`.
- FR-3.2 `platform/` gets its own `data/studio.db` (SQLite), same schema as the
  root app's, created fresh — this pilot does not share or migrate the root app's
  existing data.
- FR-3.3 `platform/`'s own `.env.local` carries `GROQ_API_KEY`/`GROQ_MODEL`,
  independent of the root app's.
- FR-3.4 Root-level `app/` is untouched: same code, same port 3000, same DB,
  still fully functional after this migration lands.

---

## 5. Technical Architecture

```
platform/                          (new, port 3999)
  Next 16 / React 19 / Tailwind v4 — independent stack, own workspace package
  ├── /                            → blank default landing + sidebar (7 products)
  ├── /agent-studio/*              → migrated pages (in-shell)
  ├── /api/agent-studio/*          → migrated route handlers (in-shell, own SQLite)
  └── external links (new tab) → Ghostwriter :8300, Explorer :8400, Trust :8501,
                                    Channels :8201, Expert Answers :8601, Voice :8701

app/ (repo root, port 3000)        → UNCHANGED, still the "real" Agent Studio
                                      deployment until a future spec retires it
```

`platform/` does not import from `design-system` (React 18 peer dependency,
Tailwind v3 preset — incompatible with the shell's React 19 / Tailwind v4 stack).
Instead, Sierra's token *values* are duplicated into the shell's own Tailwind v4
theme (FR-2.1). This is a deliberate, scoped duplication, not an oversight — see
Non-Goals.

---

## 6. Repo Structure

```
platform/
├── src/
│   ├── app/
│   │   ├── (main)/
│   │   │   ├── layout.tsx              ← sidebar + topbar shell
│   │   │   ├── page.tsx                ← blank default landing
│   │   │   ├── agent-studio/           ← migrated Agent Studio pages
│   │   │   ├── auth/                   ← kept from template, unused for now
│   │   │   └── unauthorized/           ← kept from template, unused for now
│   │   ├── api/agent-studio/           ← migrated route handlers
│   │   └── globals.css                 ← Sierra theme CSS variables
│   ├── components/                     ← template's shadcn/ui primitives, restyled
│   ├── lib/agent-studio/               ← migrated db/chat/groq/tools modules
│   └── navigation/sidebar-config.ts    ← the 7-product nav list (FR-1.3)
├── data/studio.db                      ← pilot's own SQLite (FR-3.2)
├── .env.local                          ← GROQ_API_KEY / GROQ_MODEL (FR-3.3)
├── package.json                        ← dev script: next dev -p 3999
└── tests/                              ← ported Agent Studio test suite, new paths
```

---

## 7. Testing Plan

- Reuse Agent Studio's existing Vitest suite (db, agents data layer, chat engine,
  API route tests), updated for the new `platform/src/lib/agent-studio` and
  `platform/src/app/api/agent-studio` paths. All must pass.
- `tsc --noEmit` and lint clean for `platform/`.
- Manual dev-server verification (same bar as every prior product in this repo):
  1. `npm run dev` in `platform/` — shell loads at :3999, sidebar shows 7 entries.
  2. Each of the 6 external links opens the correct existing product (requires
     those services running via `scripts/dev-up.sh`).
  3. Agent Studio in-shell flow: create agent → set knowledge/tools → playground
     round-trip (ask a question, get a grounded answer, tool call fires) — same
     acceptance check Task 12 of the original Agent Studio plan used.
  4. Toggle light/dark — Sierra colors render correctly in both, no leftover
     template preset colors visible anywhere.
  5. Confirm root-level `app/` (port 3000) still runs and still works, untouched.

---

## 8. Open Questions / Follow-ups (explicitly out of scope here)

- When (and whether) to retire the root-level Agent Studio app in favor of the
  in-shell version.
- Order and approach for migrating the remaining 6 products.
- Whether frontend-only products (Trust, Channels, Expert Answers, Voice) get
  proxied in-shell via `next.config` rewrites, or stay external links permanently.
