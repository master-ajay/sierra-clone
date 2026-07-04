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

- [ ] M1: Delete + scaffold (design-system dependency, Tailwind preset, empty AppShell)
- [ ] M2: Agent list + create (Table, EmptyState, create Modal)
- [ ] M3: Agent edit (Input/Select/Card form, Toast on save)
- [ ] M4: Playground (Card-based transcript, existing conversation endpoints)
