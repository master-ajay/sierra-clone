# Agent Studio — Design Spec

## Problem

Sierra.ai's product lineup spans 7 areas (Agent Studio, Agent Data Platform, Channels, Explorer, Ghostwriter, Insights, Trust & Reliability). Rather than cloning Sierra's marketing site, the goal is to build working software inspired by what each product *does*. This spec covers the first and most foundational area: **Agent Studio** — defining an AI agent's instructions/knowledge/tools and testing it in a chat playground. The other 6 areas will be designed and built afterward, each depending on Agent Studio existing.

## Goal

A local, single-user Next.js app where you can:
1. Create an agent with system instructions, pasted knowledge snippets, and a set of enabled tools.
2. Chat with that agent in a streaming playground, seeing tool calls happen inline.
3. Reload past conversations for a given agent after restarting the app.

## Non-goals

- Multi-channel deployment (web widget, email) — future product area (Channels).
- Analytics/guardrails dashboards — future product areas (Insights, Trust & Reliability).
- Auth, multi-tenancy, or production hosting — this is a local dev tool.
- Vector search / RAG — knowledge snippets are small enough to inject directly into the system prompt.

## Architecture

- **Stack**: Next.js (App Router) + TypeScript + Tailwind CSS.
- **Storage**: SQLite via `better-sqlite3`, single local file (e.g. `data/studio.db`).
- **LLM backend**: Groq's OpenAI-compatible API, called via the `openai` npm SDK with `baseURL` set to `https://api.groq.com/openai/v1`. Model: `openai/gpt-oss-120b` (configurable). API key read from `GROQ_API_KEY` in a gitignored `.env.local` — never hardcoded or committed.

## Data model

- `Agent`: `id`, `name`, `instructions` (text), `knowledge` (array of `{ id, title, content }` snippets), `enabledTools` (array of tool names), `createdAt`/`updatedAt`.
- `ToolDef` (code-defined, not stored in DB): a small fixed set of mock tools exposed to the model via tool-calling:
  - `lookup_order(order_id)` — returns a fake order record from an in-memory fixture list.
  - `check_refund_policy(product_category)` — returns a canned policy string per category.
  - `create_ticket(summary, priority)` — appends to an in-memory ticket list and returns a fake ticket id.
- `Conversation`: `id`, `agentId`, `messages` (array of `{ role, content, toolCalls? }`), `createdAt`.

## Pages

1. `/agents` — list existing agents, create new one.
2. `/agents/[id]/edit` — form for name, instructions, knowledge snippets (add/remove), tool toggles.
3. `/agents/[id]/playground` — chat UI: message list (streamed), input box, sidebar listing past conversations for this agent (click to reload). Tool calls render inline as a distinct message type, e.g. "🔧 called `lookup_order(order_id=123)`" followed by the result.

## Data flow

1. User edits agent config on `/agents/[id]/edit` → saved to SQLite on submit.
2. User opens `/agents/[id]/playground` → loads agent config.
3. On each user message: server route assembles `system` prompt (instructions + all knowledge snippets concatenated) + the enabled tools' JSON schemas → calls Groq chat completions with streaming.
4. If the model requests a tool call, the server executes the matching mock tool function, returns the result as a tool message, and continues the completion loop until a final assistant message is produced.
5. Full exchange (user message, any tool calls/results, final assistant reply) is appended to the conversation's `messages` array and persisted to SQLite.

## Error handling

- Missing `GROQ_API_KEY`: playground shows a clear inline error instead of a silent failure.
- Tool call to an unknown/disabled tool name: return a tool-result error message to the model rather than throwing, so the model can recover in-conversation.
- Groq API errors (rate limit, timeout): surface as a visible error bubble in the chat; conversation state up to that point is still saved.

## Testing

- Dev server boots clean (`npm run dev`).
- Create an agent with one knowledge snippet and one enabled tool; in the playground, verify:
  - A question answerable only from the knowledge snippet gets answered correctly.
  - A question requiring the enabled tool triggers a visible tool call and uses its result in the final reply.
  - Refreshing the playground and reopening the conversation from the sidebar restores the full transcript.
- No console errors in the browser during the above flow.
