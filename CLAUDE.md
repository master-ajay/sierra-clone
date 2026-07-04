# Sierra Platform Build

Sierra-inspired build: working software for what Sierra.ai's product suite
does — not a clone of their marketing site. Full-platform build (Agent Studio,
ADP, Channels, Explorer, Ghostwriter, Trust & Reliability, Expert Answers,
Voice) on top of a shared Agent Runtime & SDK.

**Cross-product process:** `docs/superpowers/DEVELOPMENT-PLAYBOOK.md` — the
single source of truth for how every product gets built (pipeline, roles,
quality bar, consistency standards). Read it once; apply it to every product.

**Products — status and specs:**

| Product | Dir | Port | Status | Spec | Plan |
|---|---|---|---|---|---|
| Agent Runtime | `agent-runtime/` | 8001 | Done | `specs/2026-07-04-agent-runtime-design.md` | `plans/2026-07-04-agent-runtime.md` |
| Agent Studio | `app/` (repo root) | 3000 | Done | `specs/2026-07-03-agent-studio-design.md` | `plans/2026-07-03-agent-studio.md` |
| Agent Data Platform | `agent-data-platform/` | 8100 | Done | `specs/2026-07-04-adp-design.md` | `plans/2026-07-04-adp.md` |
| Channels | `channels/` | 8200 | Done | `specs/2026-07-04-channels-design.md` | `plans/2026-07-04-channels.md` |
| Ghostwriter | `ghostwriter/` | 8300 | Done | `specs/2026-07-04-ghostwriter-design.md` | `plans/2026-07-04-ghostwriter.md` |
| Insights / Explorer | `explorer/` | 8400 | Done | `specs/2026-07-04-explorer-design.md` | `plans/2026-07-04-explorer.md` |
| Trust & Reliability | `trust/` | 8500 | Done | `specs/2026-07-04-trust-design.md` | `plans/2026-07-04-trust.md` |
| Expert Answers | `expert-answers/` | 8600 | Done (backend) | `specs/2026-07-04-expert-answers-design.md` | `plans/2026-07-04-expert-answers.md` |
| Voice | `voice/` | 8700 | Done (backend) | `specs/2026-07-04-voice-design.md` | `plans/2026-07-04-voice.md` |

All spec paths are relative to `docs/superpowers/`.

---

## UI Rebuild Initiative (2026-07-04)

Every backend product above is done. The existing UIs (Agent Studio, Ghostwriter,
Insights/Explorer, Trust) were built independently by separate agents with no shared
visual language, and three products (Channels, Expert Answers, Voice) have no UI at
all. This initiative discards the four existing UIs and rebuilds all seven product
UIs on one shared design system, based on Sierra's actual brand (deep forest green +
warm beige/cream, minimal card-based console). See each spec's §1 Problem Statement
for detail.

**This has a hard sequencing constraint: the Design System must be built and merged
before any product UI work starts** — every product spec below imports it. It cannot
be parallelized away.

| Sub-project | Dir | Port | Status | Spec | Plan |
|---|---|---|---|---|---|
| Design System | `design-system/` | n/a (library) | Not started — **build first, blocking** | `specs/2026-07-04-design-system-design.md` | TBD |
| Agent Studio UI (rebuild) | `app/` | 3000 | Not started — blocked on Design System | `specs/2026-07-04-agent-studio-ui-design.md` | TBD |
| Ghostwriter UI (rebuild) | `ghostwriter/` | 8300 | Not started — blocked on Design System | `specs/2026-07-04-ghostwriter-ui-design.md` | TBD |
| Insights/Explorer UI (rebuild) | `explorer/` | 8400 | Not started — blocked on Design System | `specs/2026-07-04-insights-explorer-ui-design.md` | TBD |
| Trust & Reliability UI (rebuild) | `trust/ui/` | 8501 | Not started — blocked on Design System | `specs/2026-07-04-trust-ui-design.md` | TBD |
| Channels UI (new) | `channels/ui/` | 8201 | Not started — blocked on Design System | `specs/2026-07-04-channels-ui-design.md` | TBD |
| Expert Answers UI (new) | `expert-answers/ui/` | 8601 | Not started — blocked on Design System | `specs/2026-07-04-expert-answers-ui-design.md` | TBD |
| Voice UI (new) | `voice/ui/` | 8701 | Not started — blocked on Design System | `specs/2026-07-04-voice-ui-design.md` | TBD |

**Suggested two-agent phase-2 split (once Design System is merged), balanced by
effort rather than headcount — adjust freely:**
- **Agent A:** Agent Studio UI (rebuild), Channels UI (new), Voice UI (new)
- **Agent B:** Ghostwriter UI (rebuild), Insights/Explorer UI (rebuild), Trust & Reliability UI (rebuild), Expert Answers UI (new)

**Conflict-prevention rules for parallel agents:**
- Each agent writes exclusively inside its assigned product's UI directory
  (`app/`, `ghostwriter/`, `explorer/`, `trust/ui/`, `channels/ui/`,
  `expert-answers/ui/`, `voice/ui/`) — never inside `design-system/` once it's
  merged (it becomes shared, read-only infrastructure at that point, same as
  `docs/superpowers/`), and never inside another product's backend directory.
- Specs and plans in `docs/superpowers/` are read-only during a build.
- `CLAUDE.md` is only edited between products, never mid-build.
- No cross-product imports for business logic — only `design-system` (presentation)
  and, where a spec explicitly calls for it (e.g. Channels UI and Voice UI reading
  Agent Studio's agent list), a documented read-only HTTP call to another product's
  existing API.
- If a merge conflict occurs: the later commit wins; each product UI is independent
  once Design System exists.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, SQLite via
`better-sqlite3` (`data/studio.db`), Groq's OpenAI-compatible API via the
`openai` SDK.

## Workflow

Solo trunk-based development, autonomous end-to-end per task — no human
review gate:

```
Requirement -> Break into tasks -> Plan -> Implement (TDD) -> Tests
  -> Lint & typecheck -> Self-review -> Commit to master
```

- `npm test` — Vitest
- `npm run lint` — next lint
- `npm run typecheck` — tsc --noEmit

All three must pass before a task is considered done. Progress against the
plan is tracked in `.superpowers/sdd/progress.md` (git-ignored scratch
ledger — if it's ever missing, reconstruct it from `git log` and, if needed,
this project's own Claude Code session transcripts under
`~/.claude/projects/`, not from memory).

## Coding rules

- TDD: write the failing test first, then the implementation.
- No comments unless explaining a non-obvious *why*.
- Don't add abstractions, error handling, or scope beyond what the current
  task specifies.
