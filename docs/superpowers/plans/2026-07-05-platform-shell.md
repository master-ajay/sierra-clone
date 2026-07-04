# Unified Platform Shell (Phase 1) + Agent Studio Pilot Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the vendored `next-shadcn-admin-dashboard-main/` template into `platform/`, a Sierra-themed shell app listing all 7 products, and prove the pattern by fully migrating Agent Studio into it as an in-shell product while the root-level Agent Studio app keeps running untouched.

**Architecture:** `platform/` is a new npm workspace member forked from the vendored template, kept on its native stack (Next 16 / React 19 / Tailwind v4) rather than downgraded to match the rest of the monorepo. It does not depend on the `design-system` package (incompatible peer deps); Sierra's token *values* are ported into the template's own Tailwind v4 CSS variables, and Agent Studio's migrated pages are rebuilt on the template's own shadcn/ui primitives (`Button`, `Card`, `Table`, `Dialog`, `Input`, `Textarea`, `Badge`, `sonner` for toasts) instead of importing `design-system` components.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, better-sqlite3, openai SDK (Groq-compatible), Vitest.

## Global Constraints

- Root-level Agent Studio app (`app/`, port 3000) must keep working, unmodified, through every task in this plan.
- `platform/` runs on port 3999 (every other port in the platform's range is taken: 3000, 8001, 8100, 8200/8201, 8300, 8400, 8500/8501, 8600/8601, 8700/8701).
- No dependency on `design-system` from `platform/` — its React 18 peer dependency and Tailwind v3 preset are incompatible with the shell's React 19 / Tailwind v4 stack.
- `npm test`, `npm run lint`, `npm run typecheck` (or `tsc --noEmit` directly where a product predates that script name) must pass for every task before it's considered done, per this repo's standing workflow (`CLAUDE.md`).
- No comments unless explaining a non-obvious *why*. No abstractions/error handling beyond what each task specifies.

---

### Task 1: Scaffold `platform/` as a workspace member

**Files:**
- Move: `next-shadcn-admin-dashboard-main/` → `platform/` (git mv, preserves history)
- Modify: `platform/package.json`
- Modify: `package.json` (repo root)
- Delete: `platform/.husky/`

**Interfaces:**
- Produces: a running `platform/` app on port 3999, reachable at `http://localhost:3999`, with its existing (unmodified) template UI still intact — later tasks strip and restyle it.

- [ ] **Step 1: Move the vendored template into place**

```bash
git mv next-shadcn-admin-dashboard-main platform
git rm -r --cached platform/.husky 2>/dev/null; rm -rf platform/.husky
```

- [ ] **Step 2: Edit `platform/package.json`**

Change the `name` field and `dev` script, remove the `prepare` (husky) script (this repo's git hooks are managed at the root, not per-workspace), and add a `typecheck` script matching this repo's convention:

```json
{
  "name": "platform",
  "scripts": {
    "dev": "next dev -p 3999",
    "build": "next build",
    "start": "next start -p 3999",
    "lint": "biome lint",
    "format": "biome format --write",
    "check": "biome check",
    "check:fix": "biome check --write",
    "typecheck": "tsc --noEmit",
    "generate:presets": "ts-node -P tsconfig.scripts.json src/scripts/generate-theme-presets.ts"
  }
}
```

(Keep every other key in `package.json` — dependencies, devDependencies, etc. — untouched. Only `name`, `scripts.dev`, `scripts.start` change, `scripts.prepare` is removed, `scripts.typecheck` is added.)

- [ ] **Step 3: Add `platform` to the root workspaces array**

In repo-root `package.json`, change:

```json
  "workspaces": [
    "design-system",
    "ghostwriter",
    "explorer",
    "trust/ui",
    "channels/ui",
    "expert-answers/ui",
    "voice/ui"
  ],
```

to:

```json
  "workspaces": [
    "design-system",
    "ghostwriter",
    "explorer",
    "trust/ui",
    "channels/ui",
    "expert-answers/ui",
    "voice/ui",
    "platform"
  ],
```

- [ ] **Step 4: Install and verify it boots**

```bash
npm install
cd platform && npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3999/dashboard/default
kill %1
```

Expected: `200`. (This still hits the template's original, unmodified default dashboard — Task 2 replaces it. This step only proves `platform/` runs as a workspace member on its own port.)

- [ ] **Step 5: Verify root Agent Studio is untouched**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/agents
kill %1
```

Expected: `200`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold platform/ workspace member from vendored shadcn admin template"
```

---

### Task 2: Strip demo content, flatten route structure

**Files:**
- Move: `platform/src/app/(main)/dashboard/layout.tsx` → `platform/src/app/(main)/layout.tsx`
- Move: `platform/src/app/(main)/dashboard/_components/` → `platform/src/app/(main)/_components/`
- Move: `platform/src/app/(main)/dashboard/page.tsx` → `platform/src/app/(main)/page.tsx`
- Delete: `platform/src/app/(main)/dashboard/` (everything remaining: `default/`, `(legacy)/`, `[...not-found]/`, `academy/`, `analytics/`, `calendar/`, `chat/`, `crm/`, `ecommerce/`, `finance/`, `infrastructure/`, `invoice/`, `kanban/`, `logistics/`, `mail/`, `productivity/`, `roles/`, `tasks/`, `users/`)
- Delete: `platform/src/app/(main)/chat/`
- Delete: `platform/src/app/(main)/mail/`
- Modify: `platform/src/app/(main)/_components/sidebar/app-sidebar.tsx`
- Modify: `platform/src/app/(external)/page.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 beyond the app booting.
- Produces: `(main)/layout.tsx` as the one shared shell layout every future in-shell product page (starting with Agent Studio in Task 7) mounts under, at route root `/`.

- [ ] **Step 1: Move the layout, its components, and the home page up one level**

```bash
cd platform/src/app/\(main\)
git mv dashboard/layout.tsx layout.tsx
git mv dashboard/_components _components
git mv dashboard/page.tsx page.tsx
```

- [ ] **Step 2: Delete everything else under the old `dashboard/` route and the unrelated demo route groups**

```bash
git rm -rf dashboard chat mail
cd ../../../../..   # back to repo root
```

- [ ] **Step 3: Fix the one import path the move broke**

`platform/src/app/(main)/layout.tsx` imports `AppSidebar` from the old path. Change:

```ts
import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
```

to:

```ts
import { AppSidebar } from "@/app/(main)/_components/sidebar/app-sidebar";
```

- [ ] **Step 4: Point the sidebar header link and the `(external)` redirect at the new home route**

In `platform/src/app/(main)/_components/sidebar/app-sidebar.tsx`, change:

```tsx
<Link prefetch={false} href="/dashboard/default">
```

to:

```tsx
<Link prefetch={false} href="/">
```

In `platform/src/app/(external)/page.tsx`, change:

```tsx
redirect("/dashboard/default");
```

to:

```tsx
redirect("/");
```

- [ ] **Step 5: Verify it still boots and the old dashboard routes are gone**

```bash
cd platform && npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3999/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3999/dashboard/default
kill %1
cd ..
```

Expected: `/` → `200`, `/dashboard/default` → `404`.

- [ ] **Step 6: Typecheck and commit**

```bash
cd platform && npm run typecheck && cd ..
git add -A
git commit -m "Flatten platform/ route structure, strip demo dashboards/chat/mail"
```

---

### Task 3: Sierra theme (light + dark), remove preset switcher

**Files:**
- Modify: `platform/src/app/globals.css`
- Delete: `platform/src/styles/presets/brutalist.css`
- Delete: `platform/src/styles/presets/soft-pop.css`
- Delete: `platform/src/styles/presets/tangerine.css`
- Modify: `platform/src/lib/preferences/theme.ts`
- Modify: `platform/src/app/(main)/_components/sidebar/layout-controls.tsx`

**Interfaces:**
- Consumes: Sierra token values from `design-system/tokens.js` (read-only reference, not imported as code — see Global Constraints).
- Produces: the shell renders in Sierra's forest-green/cream palette in light mode and a dark-forest equivalent in dark mode, with no preset picker in the UI.

- [ ] **Step 1: Remove the 3 unused preset CSS files and their imports**

```bash
git rm platform/src/styles/presets/brutalist.css
git rm platform/src/styles/presets/soft-pop.css
git rm platform/src/styles/presets/tangerine.css
```

In `platform/src/app/globals.css`, delete these 3 lines near the top:

```css
@import "../styles/presets/brutalist.css";
@import "../styles/presets/soft-pop.css";
@import "../styles/presets/tangerine.css";
```

- [ ] **Step 2: Replace the `:root` color block with Sierra's light theme**

In `platform/src/app/globals.css`, replace the entire `:root { ... }` block's color-related lines (keep `--radius`, `--font-sans`, `--font-mono` as-is) with:

```css
  --card: #FFFFFF;
  --card-foreground: #1F2422;
  --popover: #FFFFFF;
  --popover-foreground: #1F2422;
  --primary: #1B4332;
  --primary-foreground: #FFFFFF;
  --secondary: #F5F1E8;
  --secondary-foreground: #1F2422;
  --muted: #F5F1E8;
  --muted-foreground: #5B6560;
  --accent: #2D6A4F;
  --accent-foreground: #FFFFFF;
  --destructive: #B3452F;
  --border: #DEDACD;
  --input: #DEDACD;
  --ring: #1B4332;
  --chart-1: #1B4332;
  --chart-2: #2D6A4F;
  --chart-3: #3B6E91;
  --chart-4: #B08900;
  --chart-5: #B3452F;
  --sidebar: #1B4332;
  --sidebar-foreground: #F5F1E8;
  --sidebar-primary: #FFFFFF;
  --sidebar-primary-foreground: #1B4332;
  --sidebar-accent: #163A2A;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #163A2A;
  --sidebar-ring: #2D6A4F;
  --background: #F5F1E8;
  --foreground: #1F2422;
```

- [ ] **Step 3: Replace the `.dark` color block with a dark-forest variant**

Replace the `.dark { ... }` block's contents with:

```css
  --background: #12201A;
  --foreground: #EDEAE0;
  --card: #1B2C22;
  --card-foreground: #EDEAE0;
  --popover: #1B2C22;
  --popover-foreground: #EDEAE0;
  --primary: #2D6A4F;
  --primary-foreground: #12201A;
  --secondary: #1B2C22;
  --secondary-foreground: #EDEAE0;
  --muted: #1B2C22;
  --muted-foreground: #9BA69D;
  --accent: #2D6A4F;
  --accent-foreground: #EDEAE0;
  --destructive: #D9694A;
  --border: #2E3D33;
  --input: #2E3D33;
  --ring: #2D6A4F;
  --chart-1: #2D6A4F;
  --chart-2: #3B6E91;
  --chart-3: #B08900;
  --chart-4: #D9694A;
  --chart-5: #EDEAE0;
  --sidebar: #0F1B15;
  --sidebar-foreground: #EDEAE0;
  --sidebar-primary: #2D6A4F;
  --sidebar-primary-foreground: #EDEAE0;
  --sidebar-accent: #1B2C22;
  --sidebar-accent-foreground: #EDEAE0;
  --sidebar-border: #2E3D33;
  --sidebar-ring: #2D6A4F;
```

- [ ] **Step 4: Trim the preset options to just one, so cookie validation still works**

In `platform/src/lib/preferences/theme.ts`, replace the `THEME_PRESET_OPTIONS` array (between the `generated:themePresets:start`/`end` markers) with:

```ts
export const THEME_PRESET_OPTIONS = [
  {
    label: "Sierra",
    value: "default",
    primary: {
      light: "#1B4332",
      dark: "#2D6A4F",
    },
  },
] as const;
```

- [ ] **Step 5: Remove the preset picker control from the layout controls popover**

In `platform/src/app/(main)/_components/sidebar/layout-controls.tsx`, delete the `<Select>` block bound to `themePreset`/`onThemePresetChange` (the one populated from `THEME_PRESET_OPTIONS`) and its surrounding `<Label>` wrapper, but leave the theme-mode (Light/Dark/System), font, sidebar-variant, and navbar-style controls in place. Also delete the now-unused `onThemePresetChange` function and the `themePreset` destructure from `values`.

- [ ] **Step 6: Verify light/dark render and typecheck**

```bash
cd platform && npm run dev &
sleep 5
curl -s http://localhost:3999/ | grep -o 'class="[^"]*"' | head -1
kill %1
npm run typecheck
cd ..
```

Expected: typecheck passes clean. (Visual confirmation of the actual colors happens in Task 8's manual pass — curl can't render CSS.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Replace template theme presets with single Sierra light/dark theme"
```

---

### Task 4: Sidebar nav — 7 products

**Files:**
- Modify: `platform/src/navigation/sidebar/sidebar-items.ts`

**Interfaces:**
- Consumes: `NavGroup`/`NavMainLinkItem` types already defined in this file (unchanged).
- Produces: a `sidebarItems: NavGroup[]` export consumed by `_components/sidebar/app-sidebar.tsx` (already wired, no change needed there — see Task 2).

- [ ] **Step 1: Replace the entire nav item list**

Replace the whole body of `platform/src/navigation/sidebar/sidebar-items.ts` (keep the type definitions at the top — `NavBadge`, `NavSubItem`, `NavItemBase`, `NavMainLinkItem`, `NavMainParentItem`, `NavMainItem`, `NavGroup` — only replace the icon imports and the `sidebarItems` array itself):

```ts
import {
  Bot,
  Headphones,
  LineChart,
  MessageSquare,
  PenSquare,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
```

```ts
export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Products",
    items: [
      { id: "agent-studio", title: "Agent Studio", url: "/agent-studio", icon: Bot },
      { id: "ghostwriter", title: "Ghostwriter", url: "http://localhost:8300", icon: PenSquare, newTab: true },
      { id: "explorer", title: "Explorer", url: "http://localhost:8400", icon: LineChart, newTab: true },
      { id: "trust", title: "Trust & Reliability", url: "http://localhost:8501", icon: ShieldCheck, newTab: true },
      { id: "channels", title: "Channels", url: "http://localhost:8201", icon: MessageSquare, newTab: true },
      { id: "expert-answers", title: "Expert Answers", url: "http://localhost:8601", icon: Sparkles, newTab: true },
      { id: "voice", title: "Voice", url: "http://localhost:8701", icon: Headphones, newTab: true },
    ],
  },
];
```

- [ ] **Step 2: Verify the sidebar renders 7 items and typecheck**

```bash
cd platform && npm run typecheck && npm run dev &
sleep 5
curl -s http://localhost:3999/ | grep -c "Ghostwriter\|Explorer\|Trust & Reliability\|Channels\|Expert Answers\|Voice\|Agent Studio"
kill %1
cd ..
```

Expected: typecheck clean; grep count ≥ 7 (each label appears at least once in the server-rendered HTML).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Replace sidebar nav with the 7 platform products"
```

---

### Task 5: Migrate Agent Studio's data/logic layer into `platform/`

**Files:**
- Create: `platform/src/lib/agent-studio/db.ts`
- Create: `platform/src/lib/agent-studio/agents.ts`
- Create: `platform/src/lib/agent-studio/conversations.ts`
- Create: `platform/src/lib/agent-studio/groq.ts`
- Create: `platform/src/lib/agent-studio/tools.ts`
- Create: `platform/src/lib/agent-studio/chat.ts`
- Create: `platform/tests/lib/agent-studio/db.test.ts`
- Create: `platform/tests/lib/agent-studio/agents.test.ts`
- Create: `platform/tests/lib/agent-studio/conversations.test.ts`
- Create: `platform/tests/lib/agent-studio/tools.test.ts`
- Create: `platform/tests/lib/agent-studio/chat.test.ts`
- Modify: `platform/package.json` (add `better-sqlite3`, `openai`, `vitest` deps)
- Create: `platform/vitest.config.ts`

**Interfaces:**
- Produces (unchanged public signatures, just a new import path `@/lib/agent-studio/*`):
  - `db.ts`: `openDb(dbPath: string): Database.Database`, `getDb(): Database.Database`, `resetDbForTests(): void`
  - `agents.ts`: `Agent`, `KnowledgeSnippet` types; `createAgent`, `getAgent`, `listAgents`, `updateAgent`
  - `conversations.ts`: `Conversation`, `ChatMessage`, `ToolCallRequest` types; `createConversation`, `getConversation`, `listConversationsForAgent`, `appendMessages`
  - `groq.ts`: `getGroqClient(): OpenAI`, `buildSystemPrompt(agent): string`, `buildToolSchemas(names): object[]`, `GROQ_MODEL: string`
  - `tools.ts`: `ToolDef` type, `TOOLS: ToolDef[]`, `getToolByName`, `executeTool`
  - `chat.ts`: `toGroqMessages`, `runChatTurn`, `StreamHandlers` type
- Task 6 (API routes) and Task 7 (UI pages) both import from these files.

- [ ] **Step 1: Add the runtime dependencies `platform/package.json` needs**

`platform/` currently has none of Agent Studio's dependencies. Add to `platform/package.json` `dependencies`:

```json
    "better-sqlite3": "^11.1.2",
    "openai": "^4.56.0"
```

and to `devDependencies`:

```json
    "@types/better-sqlite3": "^7.6.13",
    "vitest": "^2.0.5"
```

- [ ] **Step 2: Add `platform/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add `"test": "vitest run"` to `platform/package.json` scripts**

- [ ] **Step 4: Install**

```bash
cd platform && npm install && cd ..
```

- [ ] **Step 5: Copy `lib/db.ts` verbatim to `platform/src/lib/agent-studio/db.ts`**

```ts
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

function createDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      knowledge TEXT NOT NULL DEFAULT '[]',
      enabled_tools TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function openDb(dbPath: string): Database.Database {
  return createDb(dbPath);
}

let defaultDb: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!defaultDb) {
    const dbPath = process.env.STUDIO_DB_PATH || path.join(process.cwd(), 'data', 'studio.db');
    defaultDb = createDb(dbPath);
  }
  return defaultDb;
}

export function resetDbForTests(): void {
  defaultDb = null;
}
```

- [ ] **Step 6: Copy `lib/agents.ts` verbatim to `platform/src/lib/agent-studio/agents.ts`**

(Identical content to the root app's `lib/agents.ts` — no import paths inside this file need to change, it has no internal `lib/*` imports.)

- [ ] **Step 7: Copy `lib/conversations.ts` verbatim to `platform/src/lib/agent-studio/conversations.ts`**

(No internal `lib/*` imports, copy unchanged.)

- [ ] **Step 8: Copy `lib/tools.ts` verbatim to `platform/src/lib/agent-studio/tools.ts`**

(No internal `lib/*` imports, copy unchanged.)

- [ ] **Step 9: Copy `lib/groq.ts` to `platform/src/lib/agent-studio/groq.ts`, updating its one relative import**

Change:

```ts
import { TOOLS } from './tools';
```

stays as `'./tools'` (unchanged — same directory) and:

```ts
import type { Agent } from './agents';
```

stays as `'./agents'` (unchanged). The file content is otherwise identical to the root app's `lib/groq.ts` — same directory layout, no path changes needed.

- [ ] **Step 10: Copy `lib/chat.ts` to `platform/src/lib/agent-studio/chat.ts`**

Identical content to the root app's `lib/chat.ts` (its relative imports `./groq`, `./tools`, `./agents`, `./conversations` are all satisfied within the same new directory, unchanged).

- [ ] **Step 11: Copy the existing lib tests, updating only their import paths**

Copy `tests/lib/db.test.ts`, `tests/lib/agents.test.ts`, `tests/lib/conversations.test.ts`, `tests/lib/tools.test.ts`, `tests/lib/groq.test.ts`, `tests/lib/chat.test.ts` from the repo root into `platform/tests/lib/agent-studio/`, changing every `from '../../lib/...'` (or whatever the root app's relative import depth is) to `from '../../../src/lib/agent-studio/...'` matching `platform/tests/lib/agent-studio/`'s depth relative to `platform/src/lib/agent-studio/`. Do not change any assertions or test bodies — only import paths.

- [ ] **Step 12: Run the ported test suite**

```bash
cd platform && npx vitest run tests/lib/agent-studio && cd ..
```

Expected: all tests pass (same count as the root app's `tests/lib/*.test.ts` for these 6 files).

- [ ] **Step 13: Add `platform/.env.local` and `platform/.env.local.example`**

`platform/.env.local.example`:

```
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

Copy it to `platform/.env.local` and fill in a real `GROQ_API_KEY` (same key used by the root app's `.env.local`, or a fresh one — either works, they're independent deployments). `.env.local` is already covered by this repo's root `.gitignore`; confirm `platform/` doesn't need its own entry by checking `git status` shows `platform/.env.local` as ignored, not untracked.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "Migrate Agent Studio's data/logic layer into platform/src/lib/agent-studio"
```

---

### Task 6: Migrate Agent Studio's API routes into `platform/`

**Files:**
- Create: `platform/src/app/api/agent-studio/agents/route.ts`
- Create: `platform/src/app/api/agent-studio/agents/[id]/route.ts`
- Create: `platform/src/app/api/agent-studio/agents/[id]/conversations/route.ts`
- Create: `platform/src/app/api/agent-studio/conversations/[id]/messages/route.ts`
- Create: `platform/tests/api/agent-studio/agents.test.ts`
- Create: `platform/tests/api/agent-studio/agent-detail.test.ts`
- Create: `platform/tests/api/agent-studio/conversations.test.ts`
- Create: `platform/tests/api/agent-studio/messages.test.ts`

**Interfaces:**
- Consumes: `getDb` from `@/lib/agent-studio/db`, `createAgent`/`getAgent`/`listAgents`/`updateAgent` from `@/lib/agent-studio/agents`, `createConversation`/`getConversation`/`listConversationsForAgent`/`appendMessages` from `@/lib/agent-studio/conversations`, `getGroqClient` from `@/lib/agent-studio/groq`, `runChatTurn` from `@/lib/agent-studio/chat` (all produced by Task 5).
- Produces: `GET/POST /api/agent-studio/agents`, `GET/PUT /api/agent-studio/agents/[id]`, `GET/POST /api/agent-studio/agents/[id]/conversations`, `POST /api/agent-studio/conversations/[id]/messages` (SSE) — consumed by Task 7's UI pages.

- [ ] **Step 1: Create `platform/src/app/api/agent-studio/agents/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/agent-studio/db';
import { createAgent, listAgents } from '@/lib/agent-studio/agents';

export async function GET() {
  const db = getDb();
  return NextResponse.json(listAgents(db));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'name is required', details: {} } }, { status: 400 });
  }
  const db = getDb();
  const agent = createAgent(db, body);
  return NextResponse.json(agent, { status: 201 });
}
```

- [ ] **Step 2: Create `platform/src/app/api/agent-studio/agents/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/agent-studio/db';
import { getAgent, updateAgent } from '@/lib/agent-studio/agents';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const agent = getAgent(db, params.id);
  if (!agent) return NextResponse.json({ error: { code: 'not_found', message: 'agent not found', details: {} } }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = getDb();
  const agent = updateAgent(db, params.id, body);
  if (!agent) return NextResponse.json({ error: { code: 'not_found', message: 'agent not found', details: {} } }, { status: 404 });
  return NextResponse.json(agent);
}
```

- [ ] **Step 3: Create `platform/src/app/api/agent-studio/agents/[id]/conversations/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/agent-studio/db';
import { createConversation, listConversationsForAgent } from '@/lib/agent-studio/conversations';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  return NextResponse.json(listConversationsForAgent(db, params.id));
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const conversation = createConversation(db, params.id);
  return NextResponse.json(conversation, { status: 201 });
}
```

- [ ] **Step 4: Create `platform/src/app/api/agent-studio/conversations/[id]/messages/route.ts`**

```ts
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/agent-studio/db';
import { getConversation, appendMessages } from '@/lib/agent-studio/conversations';
import { getAgent } from '@/lib/agent-studio/agents';
import { getGroqClient } from '@/lib/agent-studio/groq';
import { runChatTurn } from '@/lib/agent-studio/chat';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.message || typeof body.message !== 'string') {
    return new Response(JSON.stringify({ error: { code: 'validation_error', message: 'message is required', details: {} } }), { status: 400 });
  }

  const db = getDb();
  const conversation = getConversation(db, params.id);
  if (!conversation) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'conversation not found', details: {} } }), { status: 404 });
  const agent = getAgent(db, conversation.agentId);
  if (!agent) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'agent not found', details: {} } }), { status: 404 });

  let client;
  try {
    client = getGroqClient();
  } catch (err) {
    return new Response(JSON.stringify({ error: { code: 'configuration_error', message: (err as Error).message, details: {} } }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        const newMessages = await runChatTurn(client, agent, conversation.messages, body.message, {
          onContentDelta: (delta) => send({ type: 'content', delta }),
          onToolCallStart: (name) => send({ type: 'tool_call', name }),
        });
        appendMessages(db, params.id, newMessages);
        send({ type: 'done', messages: newMessages });
      } catch (err) {
        send({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
```

- [ ] **Step 5: Copy the 4 existing API tests, updating fetch URLs and import paths**

Copy `tests/api/agents.test.ts` → `platform/tests/api/agent-studio/agents.test.ts`, `tests/api/agent-detail.test.ts` → `platform/tests/api/agent-studio/agent-detail.test.ts`, `tests/api/conversations.test.ts` → `platform/tests/api/agent-studio/conversations.test.ts`, `tests/api/messages.test.ts` → `platform/tests/api/agent-studio/messages.test.ts`. In each, change:
- any `import ... from '@/lib/...'` to `from '@/lib/agent-studio/...'`
- any `import ... from '@/app/api/...'` (route handler under test) to the new `@/app/api/agent-studio/...` path
- leave all `describe`/`it`/assertion bodies unchanged

- [ ] **Step 6: Run the ported API test suite**

```bash
cd platform && npx vitest run tests/api/agent-studio && cd ..
```

Expected: all tests pass (same count as the root app's 4 corresponding files).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Migrate Agent Studio's API routes into platform/src/app/api/agent-studio"
```

---

### Task 7: Migrate Agent Studio's UI pages, rebuilt on shadcn/ui

**Files:**
- Create: `platform/src/app/(main)/agent-studio/page.tsx`
- Create: `platform/src/app/(main)/agent-studio/[id]/edit/page.tsx`
- Create: `platform/src/app/(main)/agent-studio/[id]/playground/page.tsx`

**Interfaces:**
- Consumes: `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/table`, `@/components/ui/dialog`, `@/components/ui/input`, `@/components/ui/textarea`, `@/components/ui/checkbox`, `sonner`'s `toast` (all already vendored in `platform/src/components/ui/`), and the `/api/agent-studio/*` routes from Task 6.
- Produces: `/agent-studio` (list), `/agent-studio/[id]/edit`, `/agent-studio/[id]/playground` — reachable from the sidebar's Agent Studio entry.

- [ ] **Step 1: Create the agents list page**

`platform/src/app/(main)/agent-studio/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Agent {
  id: string;
  name: string;
  instructions: string;
  updatedAt: string;
}

export default function AgentStudioPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/agent-studio/agents")
      .then((res) => res.json())
      .then((data) => {
        setAgents(data);
        setLoading(false);
      });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/agent-studio/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const agent = await res.json();
    setAgents((prev) => [agent, ...prev]);
    setName("");
    setCreating(false);
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agent Studio</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Create agent
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : agents.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No agents yet. Create one to get started.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <Link href={`/agent-studio/${agent.id}/edit`} className="font-medium hover:text-primary">
                    {agent.name}
                  </Link>
                </TableCell>
                <TableCell>{new Date(agent.updatedAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/agent-studio/${agent.id}/playground`} className="text-sm text-primary hover:underline">
                    Playground
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create agent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support Bot"
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating || !name.trim()}>
                {creating ? "Creating…" : "Create agent"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Create the edit page**

`platform/src/app/(main)/agent-studio/[id]/edit/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
}

const ALL_TOOLS = [
  { name: "lookup_order", label: "Look up order" },
  { name: "check_refund_policy", label: "Check refund policy" },
  { name: "create_ticket", label: "Create support ticket" },
];

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeSnippet[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/agent-studio/agents/${id}`)
      .then((res) => res.json())
      .then((agent) => {
        setName(agent.name);
        setInstructions(agent.instructions);
        setKnowledge(agent.knowledge);
        setEnabledTools(agent.enabledTools);
        setLoaded(true);
      });
  }, [id]);

  function addKnowledge() {
    setKnowledge((prev) => [...prev, { id: crypto.randomUUID(), title: "", content: "" }]);
  }

  function updateKnowledge(index: number, field: "title" | "content", value: string) {
    setKnowledge((prev) => prev.map((k, i) => (i === index ? { ...k, [field]: value } : k)));
  }

  function removeKnowledge(index: number) {
    setKnowledge((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTool(toolName: string) {
    setEnabledTools((prev) => (prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]));
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/agent-studio/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, instructions, knowledge, enabledTools }),
    });
    setSaving(false);
    toast.success("Agent saved");
  }

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit agent</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save agent"}
        </Button>
      </div>

      <Card className="p-4">
        <label className="mb-1.5 block text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Card>

      <Card className="p-4">
        <label className="mb-1.5 block text-sm font-medium">Instructions</label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={5}
          placeholder="You are a helpful support agent for…"
        />
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Knowledge</span>
          <button type="button" onClick={addKnowledge} className="text-sm text-primary hover:underline">
            + Add snippet
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {knowledge.length === 0 && (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No knowledge snippets yet.
            </p>
          )}
          {knowledge.map((k, i) => (
            <div key={k.id} className="flex flex-col gap-2 rounded-md border p-3">
              <Input
                placeholder="Title"
                value={k.title}
                onChange={(e) => updateKnowledge(i, "title", e.target.value)}
              />
              <Textarea
                value={k.content}
                onChange={(e) => updateKnowledge(i, "content", e.target.value)}
                rows={3}
              />
              <button
                type="button"
                onClick={() => removeKnowledge(i)}
                className="self-start text-sm text-destructive hover:opacity-80"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <span className="mb-3 block text-sm font-medium">Tools</span>
        <div className="flex flex-col gap-2">
          {ALL_TOOLS.map((tool) => (
            <label key={tool.name} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <Checkbox
                checked={enabledTools.includes(tool.name)}
                onCheckedChange={() => toggleTool(tool.name)}
              />
              {tool.label}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create the playground page**

`platform/src/app/(main)/agent-studio/[id]/playground/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCallRequest[];
  toolName?: string;
}

interface ConversationSummary {
  id: string;
  createdAt: string;
  messages: ChatMessage[];
}

export default function PlaygroundPage() {
  const { id } = useParams<{ id: string }>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingContent = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/agent-studio/agents/${id}/conversations`)
      .then((res) => res.json())
      .then((list: ConversationSummary[]) => setConversations(list));
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function startNewConversation() {
    const res = await fetch(`/api/agent-studio/agents/${id}/conversations`, { method: "POST" });
    const conversation = await res.json();
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
    setMessages([]);
  }

  function loadConversation(convId: string) {
    const found = conversations.find((c) => c.id === convId);
    setActiveId(convId);
    setMessages(found?.messages ?? []);
  }

  async function sendMessage() {
    if (!activeId || !input.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);
    setError(null);
    streamingContent.current = "";

    const res = await fetch(`/api/agent-studio/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage.content }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Request failed (${res.status})`);
      setStreaming(false);
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const event = JSON.parse(part.slice(6));
        if (event.type === "content") {
          streamingContent.current += event.delta;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: streamingContent.current };
            return next;
          });
        } else if (event.type === "tool_call") {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "tool", content: "", toolName: event.name },
            prev[prev.length - 1],
          ]);
        } else if (event.type === "done") {
          setMessages(event.messages);
        } else if (event.type === "error") {
          setError(event.message);
          setMessages((prev) => prev.slice(0, -1));
        }
      }
    }
    setStreaming(false);
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-4 gap-6">
      <aside className="col-span-1 flex flex-col">
        <Button size="sm" onClick={startNewConversation} className="mb-4 w-full">
          New chat
        </Button>
        <ul className="flex-1 space-y-1 overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => loadConversation(c.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  activeId === c.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {new Date(c.createdAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="col-span-3 flex h-full flex-col">
        <Card className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="transcript">
          <div ref={scrollRef} className="h-full space-y-3 overflow-y-auto">
            {messages.length === 0 && (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">
                {activeId ? "Say hello to get started." : "Start a new chat to begin."}
              </p>
            )}
            {messages.map((m, i) =>
              m.role === "tool" ? (
                <div key={i} className="text-xs italic text-muted-foreground">
                  called <code className="text-primary">{m.toolName}</code>
                </div>
              ) : (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <span
                    className={`inline-block max-w-[75%] rounded-md px-4 py-2.5 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              )
            )}
          </div>
        </Card>
        {error && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={!activeId || streaming}
            placeholder={activeId ? "Type a message…" : "Start a new chat first"}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!activeId || streaming}>
            Send message
          </Button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Add the `sonner` `<Toaster />` to the shell layout**

The template already vendors `sonner` (`platform/src/components/ui/sonner.tsx`) but check whether `<Toaster />` is already mounted in `platform/src/app/layout.tsx` (root layout, above `(main)`). If it is not present, add it there so `toast.success(...)` calls from Step 2 render.

- [ ] **Step 5: Manual verification of the migrated flow**

```bash
# in one terminal
cd platform && npm run dev

# in another, with GROQ_API_KEY set in platform/.env.local
curl -s -X POST http://localhost:3999/api/agent-studio/agents -H 'Content-Type: application/json' -d '{"name":"Support Bot"}'
# copy the returned "id", then:
curl -s -X PUT http://localhost:3999/api/agent-studio/agents/<id> -H 'Content-Type: application/json' \
  -d '{"instructions":"You are a support agent.","knowledge":[{"id":"k1","title":"Shipping","content":"Shipping takes 2 business days."}],"enabledTools":["lookup_order"]}'
curl -s -X POST http://localhost:3999/api/agent-studio/agents/<id>/conversations
# copy the returned conversation "id", then:
curl -N -s -X POST http://localhost:3999/api/agent-studio/conversations/<conv-id>/messages \
  -H 'Content-Type: application/json' -d '{"message":"How long does shipping take?"}'
```

Expected: the SSE stream includes `{"type":"content",...}` events whose concatenated text references the 2-business-day shipping snippet, followed by a `{"type":"done",...}` event.

- [ ] **Step 6: Typecheck and commit**

```bash
cd platform && npm run typecheck && cd ..
git add -A
git commit -m "Migrate Agent Studio UI pages into platform/, rebuilt on shadcn/ui primitives"
```

---

### Task 8: Final integration pass

**Files:** none (verification only, per spec §7).

**Interfaces:** none — this task only exercises what Tasks 1–7 built.

- [ ] **Step 1: Start every backend this shell links to**

```bash
./scripts/dev-up.sh
```

- [ ] **Step 2: Start the shell**

```bash
cd platform && npm run dev &
sleep 5
```

- [ ] **Step 3: Confirm all 7 sidebar entries resolve**

```bash
curl -s -o /dev/null -w "agent-studio: %{http_code}\n" http://localhost:3999/agent-studio
curl -s -o /dev/null -w "ghostwriter: %{http_code}\n" http://localhost:8300
curl -s -o /dev/null -w "explorer: %{http_code}\n" http://localhost:8400
curl -s -o /dev/null -w "trust: %{http_code}\n" http://localhost:8501
curl -s -o /dev/null -w "channels: %{http_code}\n" http://localhost:8201
curl -s -o /dev/null -w "expert-answers: %{http_code}\n" http://localhost:8601
curl -s -o /dev/null -w "voice: %{http_code}\n" http://localhost:8701
```

Expected: `200` for every line.

- [ ] **Step 4: Full Agent Studio in-shell flow via browser (or repeat Task 7 Step 5's curl sequence)**

Create agent → set knowledge/tools → playground round-trip (ask a question, get a grounded answer, confirm a tool call fires for a question that needs `lookup_order`) — same acceptance bar as the original Agent Studio plan's Task 12.

- [ ] **Step 5: Confirm root-level Agent Studio still works, untouched**

```bash
curl -s -o /dev/null -w "root agent studio: %{http_code}\n" http://localhost:3000/agents
```

Expected: `200`.

- [ ] **Step 6: Tear down and record progress**

```bash
./scripts/dev-down.sh
kill %1 2>/dev/null
```

Append a summary of this pass (which checks passed, any deviations from the plan, anything left for a follow-up spec) to `.superpowers/sdd/progress.md` under a new "Unified Platform Shell" section, following the same format as the existing Agent Studio and Agent Runtime sections.

- [ ] **Step 7: Commit**

```bash
git add .superpowers/sdd/progress.md
git commit -m "Record platform shell + Agent Studio pilot migration verification"
```
