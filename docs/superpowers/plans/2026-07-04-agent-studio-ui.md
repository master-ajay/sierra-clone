# Agent Studio UI Rebuild — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-agent-studio-ui-design.md`
Location: `app/` (repo root Next.js app)
Commit prefix: `[agent-studio-ui]`

**Claimed 2026-07-04 ~11:55 — part of the "Agent Studio UI, Channels UI, Voice UI"
suggested bucket in CLAUDE.md's phase-2 split. Starting with this one; will
check for collisions before picking up the other two.**

Visual rebuild only, per spec's non-goals — no change to `app/api/**` or any
backend logic. Every existing action must keep working identically.

## Status

- [x] M1: Delete + scaffold (design-system dependency, Tailwind preset, empty AppShell)
- [x] M2: Agent list + create (Table, EmptyState, create Modal)
- [x] M3: Agent edit (Input/Select/Card form, Toast on save)
- [x] M4: Playground (Card-based transcript, existing conversation endpoints)

## Notes for whoever builds another product's UI next

- `design-system` has no `Textarea` or `Checkbox` component in v1 — style a
  native element with the same token utility classes Input/Select use
  (`bg-bg-surface border-border text-text-primary focus-visible:outline-brand-primary`)
  rather than inventing bespoke colors. Don't edit `design-system/` itself —
  it's merged/read-only per CLAUDE.md now.
- Shared root `node_modules` means `better-sqlite3` (or any native module)
  can get corrupted mid-rebuild if two agents run `npm rebuild` at the same
  time in different workspace directories. If tests suddenly fail with a
  `NODE_MODULE_VERSION` or `ENOENT .../build/...` error, check
  `ps aux | grep node-gyp` before assuming your own code broke something.

All 32 tests passing, lint clean, tsc --noEmit clean, npm run build clean.
Live-verified end-to-end against the dev server including a real
GROQ-backed playground conversation.
