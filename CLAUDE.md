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
| Expert Answers | `expert-answers/` | 8600 | **In progress — Agent B** | `specs/2026-07-04-expert-answers-design.md` | `plans/2026-07-04-expert-answers.md` |
| Voice | `voice/` | 8700 | **In progress — Agent A** | `specs/2026-07-04-voice-design.md` | `plans/2026-07-04-voice.md` |

All spec paths are relative to `docs/superpowers/`.

**Conflict-prevention rules for parallel agents:**
- **Agent A owns `voice/` only.** Commit prefix: `[voice]`.
- **Agent B owns `expert-answers/` only.** Commit prefix: `[expert-answers]`.
- Each agent writes exclusively inside its assigned product directory.
- Specs and plans in `docs/superpowers/` are read-only during a build.
- `CLAUDE.md` is only edited between products, never mid-build.
- No cross-product imports — products communicate at runtime via HTTP only.
- If a merge conflict occurs: the later commit wins; both products are independent.

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
