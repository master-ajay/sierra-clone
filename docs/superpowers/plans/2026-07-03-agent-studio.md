# Agent Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js app where a user can define an AI agent (instructions, knowledge, tools), chat with it in a streaming playground, and reload past conversations.

**Architecture:** Next.js App Router API routes backed by SQLite (via `better-sqlite3`) for storage, and Groq's OpenAI-compatible chat completions API (via the `openai` npm SDK) for the model. Pure logic (data layer, prompt/tool-schema assembly, the tool-calling loop) is unit-tested with Vitest using fakes/mocks; the three UI pages are verified manually against a running dev server in the final task.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, better-sqlite3, openai SDK (pointed at Groq), Vitest.

## Global Constraints

- Single-user, local-only app: no auth, no multi-tenancy, no deployment/hosting concerns.
- LLM backend is Groq's OpenAI-compatible API: `baseURL: 'https://api.groq.com/openai/v1'`, default model `openai/gpt-oss-120b` (overridable via `GROQ_MODEL` env var).
- API key read from `GROQ_API_KEY`, stored only in a gitignored `.env.local` — never hardcoded, never committed.
- Storage: SQLite via `better-sqlite3`, single local file at `data/studio.db` (path overridable via `STUDIO_DB_PATH`, used by tests).
- Knowledge is injected directly into the system prompt — no vector search / RAG.
- No multi-channel deployment, no analytics/guardrails dashboards — those are separate future product areas.

---

### Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Test: `tests/sanity.test.ts`

**Interfaces:**
- Produces: a working `npm run dev` (Next.js dev server) and `npm test` (Vitest) command, plus the `@/*` → project-root TypeScript/Vitest path alias every later task's imports rely on.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "agent-studio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "better-sqlite3": "^11.1.2",
    "openai": "^4.56.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/node": "^20.14.15",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.7",
    "postcss": "^8.4.41",
    "autoprefixer": "^10.4.20",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: lockfile created, `node_modules/` populated, no errors.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
```

- [ ] **Step 5: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Write `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Write `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Write `app/layout.tsx`**

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Agent Studio',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Write `app/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/agents');
}
```

- [ ] **Step 10: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 11: Write `.gitignore`**

```
node_modules/
.next/
data/*.db
data/*.db-*
.env.local
```

- [ ] **Step 12: Write `.env.local.example`**

```
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

- [ ] **Step 13: Write a sanity test**

```ts
// tests/sanity.test.ts
import { describe, expect, it } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 14: Run the test suite**

Run: `npm test`
Expected: 1 passed (`tests/sanity.test.ts`).

- [ ] **Step 15: Verify the dev server boots**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000` with no errors; visiting `/` redirects to `/agents` (will 404 until Task 9 — that's expected at this point). Stop the server after confirming it boots.

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.js tailwind.config.ts postcss.config.js vitest.config.ts .gitignore .env.local.example app/globals.css app/layout.tsx app/page.tsx tests/sanity.test.ts
git commit -m "Scaffold Next.js + Tailwind + Vitest project for Agent Studio"
```

---

### Task 2: SQLite schema & db module

**Files:**
- Create: `lib/db.ts`
- Test: `tests/lib/db.test.ts`

**Interfaces:**
- Produces: `openDb(dbPath: string): Database.Database`, `getDb(): Database.Database`, `resetDbForTests(): void`. Later tasks call `getDb()` (routes) or `openDb()` directly (tests) to get a `better-sqlite3` `Database` handle with `agents` and `conversations` tables already created.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/db.test.ts
import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '@/lib/db';

describe('openDb', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates agents and conversations tables', () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'studio-db-test-'));
    const db = openDb(path.join(tempDir, 'test.db'));
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(['agents', 'conversations']));
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/db.test.ts`
Expected: FAIL — `Cannot find module '@/lib/db'` (file doesn't exist yet).

- [ ] **Step 3: Write `lib/db.ts`**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts tests/lib/db.test.ts
git commit -m "Add SQLite schema and db module"
```

---

### Task 3: Agent data layer

**Files:**
- Create: `lib/agents.ts`
- Test: `tests/lib/agents.test.ts`

**Interfaces:**
- Consumes: `openDb` from Task 2 (`@/lib/db`).
- Produces: `interface KnowledgeSnippet { id: string; title: string; content: string }`, `interface Agent { id: string; name: string; instructions: string; knowledge: KnowledgeSnippet[]; enabledTools: string[]; createdAt: string; updatedAt: string }`, `createAgent(db, input): Agent`, `getAgent(db, id): Agent | null`, `listAgents(db): Agent[]`, `updateAgent(db, id, updates): Agent | null`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/agents.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '@/lib/db';
import { createAgent, getAgent, listAgents, updateAgent } from '@/lib/agents';

let tempDir: string;
let db: Database.Database;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'studio-agents-test-'));
  db = openDb(path.join(tempDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe('agents data layer', () => {
  it('creates an agent with defaults', () => {
    const agent = createAgent(db, { name: 'Support Bot' });
    expect(agent.name).toBe('Support Bot');
    expect(agent.instructions).toBe('');
    expect(agent.knowledge).toEqual([]);
    expect(agent.enabledTools).toEqual([]);
  });

  it('retrieves a created agent by id', () => {
    const agent = createAgent(db, { name: 'Support Bot' });
    expect(getAgent(db, agent.id)).toEqual(agent);
  });

  it('returns null for a missing agent', () => {
    expect(getAgent(db, 'does-not-exist')).toBeNull();
  });

  it('lists all created agents', () => {
    const first = createAgent(db, { name: 'First' });
    const second = createAgent(db, { name: 'Second' });
    const list = listAgents(db);
    expect(list.map((a) => a.id).sort()).toEqual([first.id, second.id].sort());
  });

  it('updates an agent, leaving unspecified fields unchanged', () => {
    const agent = createAgent(db, { name: 'Support Bot' });
    const updated = updateAgent(db, agent.id, { instructions: 'Be kind.', enabledTools: ['lookup_order'] });
    expect(updated?.instructions).toBe('Be kind.');
    expect(updated?.enabledTools).toEqual(['lookup_order']);
    expect(updated?.name).toBe('Support Bot');
  });

  it('returns null when updating a missing agent', () => {
    expect(updateAgent(db, 'does-not-exist', { name: 'X' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/agents.test.ts`
Expected: FAIL — `Cannot find module '@/lib/agents'`.

- [ ] **Step 3: Write `lib/agents.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
}

export interface Agent {
  id: string;
  name: string;
  instructions: string;
  knowledge: KnowledgeSnippet[];
  enabledTools: string[];
  createdAt: string;
  updatedAt: string;
}

interface AgentRow {
  id: string;
  name: string;
  instructions: string;
  knowledge: string;
  enabled_tools: string;
  created_at: string;
  updated_at: string;
}

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    instructions: row.instructions,
    knowledge: JSON.parse(row.knowledge),
    enabledTools: JSON.parse(row.enabled_tools),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createAgent(
  db: Database.Database,
  input: { name: string; instructions?: string; knowledge?: KnowledgeSnippet[]; enabledTools?: string[] }
): Agent {
  const now = new Date().toISOString();
  const agent: Agent = {
    id: randomUUID(),
    name: input.name,
    instructions: input.instructions ?? '',
    knowledge: input.knowledge ?? [],
    enabledTools: input.enabledTools ?? [],
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO agents (id, name, instructions, knowledge, enabled_tools, created_at, updated_at)
     VALUES (@id, @name, @instructions, @knowledge, @enabledTools, @createdAt, @updatedAt)`
  ).run({
    id: agent.id,
    name: agent.name,
    instructions: agent.instructions,
    knowledge: JSON.stringify(agent.knowledge),
    enabledTools: JSON.stringify(agent.enabledTools),
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  });
  return agent;
}

export function getAgent(db: Database.Database, id: string): Agent | null {
  const row = db.prepare(`SELECT * FROM agents WHERE id = ?`).get(id) as AgentRow | undefined;
  return row ? rowToAgent(row) : null;
}

export function listAgents(db: Database.Database): Agent[] {
  const rows = db.prepare(`SELECT * FROM agents ORDER BY created_at DESC`).all() as AgentRow[];
  return rows.map(rowToAgent);
}

export function updateAgent(
  db: Database.Database,
  id: string,
  updates: { name?: string; instructions?: string; knowledge?: KnowledgeSnippet[]; enabledTools?: string[] }
): Agent | null {
  const existing = getAgent(db, id);
  if (!existing) return null;
  const updated: Agent = {
    ...existing,
    name: updates.name ?? existing.name,
    instructions: updates.instructions ?? existing.instructions,
    knowledge: updates.knowledge ?? existing.knowledge,
    enabledTools: updates.enabledTools ?? existing.enabledTools,
    updatedAt: new Date().toISOString(),
  };
  db.prepare(
    `UPDATE agents SET name = @name, instructions = @instructions, knowledge = @knowledge,
     enabled_tools = @enabledTools, updated_at = @updatedAt WHERE id = @id`
  ).run({
    id: updated.id,
    name: updated.name,
    instructions: updated.instructions,
    knowledge: JSON.stringify(updated.knowledge),
    enabledTools: JSON.stringify(updated.enabledTools),
    updatedAt: updated.updatedAt,
  });
  return updated;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/agents.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agents.ts tests/lib/agents.test.ts
git commit -m "Add agent data layer (CRUD over SQLite)"
```

---

### Task 4: Mock tools module

**Files:**
- Create: `lib/tools.ts`
- Test: `tests/lib/tools.test.ts`

**Interfaces:**
- Produces: `interface ToolDef { name: string; description: string; parameters: {...}; execute: (args) => string }`, `TOOLS: ToolDef[]` (containing `lookup_order`, `check_refund_policy`, `create_ticket`), `getToolByName(name): ToolDef | undefined`, `executeTool(name, args): string` (always returns a JSON string, never throws).

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/tools.test.ts
import { describe, expect, it } from 'vitest';
import { executeTool, getToolByName } from '@/lib/tools';

describe('tools', () => {
  it('looks up a known order', () => {
    const result = JSON.parse(executeTool('lookup_order', { order_id: '1001' }));
    expect(result).toEqual({ order_id: '1001', status: 'shipped', item: 'Wireless Mouse', eta: '2026-07-05' });
  });

  it('returns an error for an unknown order', () => {
    const result = JSON.parse(executeTool('lookup_order', { order_id: '9999' }));
    expect(result.error).toContain('9999');
  });

  it('returns a default refund policy for an unlisted category', () => {
    const result = JSON.parse(executeTool('check_refund_policy', { product_category: 'toys' }));
    expect(result.policy).toContain('30 days');
  });

  it('creates a ticket and returns an id', () => {
    const result = JSON.parse(executeTool('create_ticket', { summary: 'Broken item', priority: 'high' }));
    expect(result.ticket_id).toMatch(/^TCK-/);
    expect(result.status).toBe('created');
  });

  it('returns an error for an unknown tool name', () => {
    const result = JSON.parse(executeTool('does_not_exist', {}));
    expect(result.error).toContain('Unknown tool');
  });

  it('exposes lookup_order via getToolByName', () => {
    expect(getToolByName('lookup_order')?.name).toBe('lookup_order');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/tools.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tools'`.

- [ ] **Step 3: Write `lib/tools.ts`**

```ts
export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  execute: (args: Record<string, unknown>) => string;
}

const FAKE_ORDERS: Record<string, { status: string; item: string; eta: string }> = {
  '1001': { status: 'shipped', item: 'Wireless Mouse', eta: '2026-07-05' },
  '1002': { status: 'processing', item: 'Mechanical Keyboard', eta: '2026-07-10' },
};

const FAKE_REFUND_POLICIES: Record<string, string> = {
  electronics: 'Electronics can be refunded within 30 days if unopened.',
  clothing: 'Clothing can be refunded within 60 days with tags attached.',
  default: 'Standard refund window is 30 days from delivery.',
};

const createdTickets: { id: string; summary: string; priority: string }[] = [];

export const TOOLS: ToolDef[] = [
  {
    name: 'lookup_order',
    description: "Look up an order's status by its order ID.",
    parameters: {
      type: 'object',
      properties: { order_id: { type: 'string', description: 'The order ID to look up.' } },
      required: ['order_id'],
    },
    execute: (args) => {
      const orderId = String(args.order_id);
      const order = FAKE_ORDERS[orderId];
      if (!order) return JSON.stringify({ error: `No order found with ID ${orderId}` });
      return JSON.stringify({ order_id: orderId, ...order });
    },
  },
  {
    name: 'check_refund_policy',
    description: 'Check the refund policy for a product category.',
    parameters: {
      type: 'object',
      properties: {
        product_category: { type: 'string', description: 'e.g. electronics, clothing' },
      },
      required: ['product_category'],
    },
    execute: (args) => {
      const category = String(args.product_category).toLowerCase();
      return JSON.stringify({ policy: FAKE_REFUND_POLICIES[category] ?? FAKE_REFUND_POLICIES.default });
    },
  },
  {
    name: 'create_ticket',
    description: 'Create a support ticket for an issue that needs human follow-up.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Short summary of the issue.' },
        priority: { type: 'string', description: 'One of: low, medium, high.' },
      },
      required: ['summary', 'priority'],
    },
    execute: (args) => {
      const id = `TCK-${createdTickets.length + 1}`;
      createdTickets.push({ id, summary: String(args.summary), priority: String(args.priority) });
      return JSON.stringify({ ticket_id: id, status: 'created' });
    },
  },
];

export function getToolByName(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

export function executeTool(name: string, args: Record<string, unknown>): string {
  const tool = getToolByName(name);
  if (!tool) return JSON.stringify({ error: `Unknown tool: ${name}` });
  return tool.execute(args);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/tools.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tools.ts tests/lib/tools.test.ts
git commit -m "Add mock tools module (lookup_order, check_refund_policy, create_ticket)"
```

---

### Task 5: Conversation data layer

**Files:**
- Create: `lib/conversations.ts`
- Test: `tests/lib/conversations.test.ts`

**Interfaces:**
- Consumes: `openDb` from Task 2.
- Produces: `interface ToolCallRequest { id: string; name: string; arguments: Record<string, unknown> }`, `interface ChatMessage { role: 'user' | 'assistant' | 'tool'; content: string; toolCalls?: ToolCallRequest[]; toolCallId?: string; toolName?: string }`, `interface Conversation { id: string; agentId: string; messages: ChatMessage[]; createdAt: string; updatedAt: string }`, `createConversation(db, agentId): Conversation`, `getConversation(db, id): Conversation | null`, `listConversationsForAgent(db, agentId): Conversation[]`, `appendMessages(db, id, newMessages): Conversation | null`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/conversations.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '@/lib/db';
import { createConversation, getConversation, listConversationsForAgent, appendMessages } from '@/lib/conversations';

let tempDir: string;
let db: Database.Database;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'studio-conv-test-'));
  db = openDb(path.join(tempDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe('conversations data layer', () => {
  it('creates an empty conversation for an agent', () => {
    const conv = createConversation(db, 'agent-1');
    expect(conv.agentId).toBe('agent-1');
    expect(conv.messages).toEqual([]);
  });

  it('appends messages and persists them', () => {
    const conv = createConversation(db, 'agent-1');
    const updated = appendMessages(db, conv.id, [{ role: 'user', content: 'hi' }]);
    expect(updated?.messages).toEqual([{ role: 'user', content: 'hi' }]);
    const reloaded = getConversation(db, conv.id);
    expect(reloaded?.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('returns null when appending to a missing conversation', () => {
    expect(appendMessages(db, 'does-not-exist', [])).toBeNull();
  });

  it('lists conversations for a given agent only', () => {
    const convA = createConversation(db, 'agent-1');
    createConversation(db, 'agent-2');
    const list = listConversationsForAgent(db, 'agent-1');
    expect(list.map((c) => c.id)).toEqual([convA.id]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/conversations.test.ts`
Expected: FAIL — `Cannot find module '@/lib/conversations'`.

- [ ] **Step 3: Write `lib/conversations.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallRequest[];
  toolCallId?: string;
  toolName?: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ConversationRow {
  id: string;
  agent_id: string;
  messages: string;
  created_at: string;
  updated_at: string;
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    agentId: row.agent_id,
    messages: JSON.parse(row.messages),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createConversation(db: Database.Database, agentId: string): Conversation {
  const now = new Date().toISOString();
  const conversation: Conversation = { id: randomUUID(), agentId, messages: [], createdAt: now, updatedAt: now };
  db.prepare(
    `INSERT INTO conversations (id, agent_id, messages, created_at, updated_at)
     VALUES (@id, @agentId, @messages, @createdAt, @updatedAt)`
  ).run({
    id: conversation.id,
    agentId: conversation.agentId,
    messages: JSON.stringify(conversation.messages),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  });
  return conversation;
}

export function getConversation(db: Database.Database, id: string): Conversation | null {
  const row = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id) as ConversationRow | undefined;
  return row ? rowToConversation(row) : null;
}

export function listConversationsForAgent(db: Database.Database, agentId: string): Conversation[] {
  const rows = db
    .prepare(`SELECT * FROM conversations WHERE agent_id = ? ORDER BY created_at DESC`)
    .all(agentId) as ConversationRow[];
  return rows.map(rowToConversation);
}

export function appendMessages(db: Database.Database, id: string, newMessages: ChatMessage[]): Conversation | null {
  const existing = getConversation(db, id);
  if (!existing) return null;
  const updated: Conversation = {
    ...existing,
    messages: [...existing.messages, ...newMessages],
    updatedAt: new Date().toISOString(),
  };
  db.prepare(`UPDATE conversations SET messages = @messages, updated_at = @updatedAt WHERE id = @id`).run({
    id: updated.id,
    messages: JSON.stringify(updated.messages),
    updatedAt: updated.updatedAt,
  });
  return updated;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/conversations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/conversations.ts tests/lib/conversations.test.ts
git commit -m "Add conversation data layer (CRUD over SQLite)"
```

---

### Task 6: Groq client & prompt assembly

**Files:**
- Create: `lib/groq.ts`
- Test: `tests/lib/groq.test.ts`

**Interfaces:**
- Consumes: `Agent` from Task 3 (`@/lib/agents`), `TOOLS` from Task 4 (`@/lib/tools`).
- Produces: `getGroqClient(): OpenAI` (throws a clear error if `GROQ_API_KEY` unset), `buildSystemPrompt(agent: Agent): string`, `buildToolSchemas(enabledToolNames: string[])` (returns Groq/OpenAI-shaped tool schema array), `GROQ_MODEL: string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/groq.test.ts
import { describe, expect, it, afterEach } from 'vitest';
import { buildSystemPrompt, buildToolSchemas, getGroqClient } from '@/lib/groq';
import type { Agent } from '@/lib/agents';

const agent: Agent = {
  id: 'a1',
  name: 'Test',
  instructions: 'Be concise.',
  knowledge: [{ id: 'k1', title: 'Shipping', content: 'Ships in 3 days.' }],
  enabledTools: ['lookup_order', 'create_ticket'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('buildSystemPrompt', () => {
  it('includes instructions and knowledge titles/content', () => {
    const prompt = buildSystemPrompt(agent);
    expect(prompt).toContain('Be concise.');
    expect(prompt).toContain('Shipping');
    expect(prompt).toContain('Ships in 3 days.');
  });
});

describe('buildToolSchemas', () => {
  it('only includes enabled tools', () => {
    const schemas = buildToolSchemas(['lookup_order']);
    expect(schemas).toHaveLength(1);
    expect(schemas[0].function.name).toBe('lookup_order');
  });
});

describe('getGroqClient', () => {
  const original = process.env.GROQ_API_KEY;
  afterEach(() => {
    process.env.GROQ_API_KEY = original;
  });

  it('throws a clear error when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => getGroqClient()).toThrow('GROQ_API_KEY is not set');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/groq.test.ts`
Expected: FAIL — `Cannot find module '@/lib/groq'`.

- [ ] **Step 3: Write `lib/groq.ts`**

```ts
import OpenAI from 'openai';
import type { Agent } from './agents';
import { TOOLS } from './tools';

export function getGroqClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to .env.local.');
  }
  return new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
}

export function buildSystemPrompt(agent: Agent): string {
  const knowledgeText = agent.knowledge.map((k) => `### ${k.title}\n${k.content}`).join('\n\n');
  return [agent.instructions, knowledgeText ? `\nRelevant knowledge:\n${knowledgeText}` : ''].join('\n').trim();
}

export function buildToolSchemas(enabledToolNames: string[]) {
  return TOOLS.filter((t) => enabledToolNames.includes(t.name)).map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/groq.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/groq.ts tests/lib/groq.test.ts
git commit -m "Add Groq client and system prompt/tool schema assembly"
```

---

### Task 7: Agents API routes

**Files:**
- Create: `app/api/agents/route.ts`
- Create: `app/api/agents/[id]/route.ts`
- Test: `tests/api/agents.test.ts`
- Test: `tests/api/agent-detail.test.ts`

**Interfaces:**
- Consumes: `getDb`, `resetDbForTests` from Task 2; `createAgent`, `getAgent`, `listAgents`, `updateAgent` from Task 3.
- Produces: `GET`/`POST` handlers at `app/api/agents/route.ts`, `GET`/`PUT` handlers at `app/api/agents/[id]/route.ts` — consumed by the UI pages in Tasks 9–11.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/api/agents.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resetDbForTests } from '@/lib/db';
import { GET, POST } from '@/app/api/agents/route';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'studio-test-'));
  process.env.STUDIO_DB_PATH = path.join(tempDir, 'test.db');
  resetDbForTests();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('agents API', () => {
  it('creates and lists an agent', async () => {
    const createRes = await POST(
      new Request('http://localhost/api/agents', { method: 'POST', body: JSON.stringify({ name: 'Support Bot' }) }) as any
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe('Support Bot');

    const listRes = await GET();
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it('rejects creation without a name', async () => {
    const req = new Request('http://localhost/api/agents', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
```

```ts
// tests/api/agent-detail.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resetDbForTests, getDb } from '@/lib/db';
import { createAgent } from '@/lib/agents';
import { GET, PUT } from '@/app/api/agents/[id]/route';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'studio-agent-detail-test-'));
  process.env.STUDIO_DB_PATH = path.join(tempDir, 'test.db');
  resetDbForTests();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('agent detail API', () => {
  it('gets an existing agent', async () => {
    const db = getDb();
    const agent = createAgent(db, { name: 'Test Agent' });
    const res = await GET(new Request('http://localhost') as any, { params: { id: agent.id } });
    const body = await res.json();
    expect(body.id).toBe(agent.id);
  });

  it('returns 404 for a missing agent', async () => {
    const res = await GET(new Request('http://localhost') as any, { params: { id: 'nope' } });
    expect(res.status).toBe(404);
  });

  it('updates an agent', async () => {
    const db = getDb();
    const agent = createAgent(db, { name: 'Test Agent' });
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ instructions: 'New instructions' }),
      }) as any,
      { params: { id: agent.id } }
    );
    const body = await res.json();
    expect(body.instructions).toBe('New instructions');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/api/agents.test.ts tests/api/agent-detail.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/agents/route'`.

- [ ] **Step 3: Write `app/api/agents/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createAgent, listAgents } from '@/lib/agents';

export async function GET() {
  const db = getDb();
  return NextResponse.json(listAgents(db));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const db = getDb();
  const agent = createAgent(db, body);
  return NextResponse.json(agent, { status: 201 });
}
```

- [ ] **Step 4: Write `app/api/agents/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAgent, updateAgent } from '@/lib/agents';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const agent = getAgent(db, params.id);
  if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = getDb();
  const agent = updateAgent(db, params.id, body);
  if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(agent);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/api/agents.test.ts tests/api/agent-detail.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add app/api/agents tests/api/agents.test.ts tests/api/agent-detail.test.ts
git commit -m "Add agents list/create/get/update API routes"
```

---

### Task 8: Conversation chat engine + API routes

**Files:**
- Create: `lib/chat.ts`
- Create: `app/api/agents/[id]/conversations/route.ts`
- Create: `app/api/conversations/[id]/messages/route.ts`
- Test: `tests/lib/chat.test.ts`
- Test: `tests/api/conversations.test.ts`
- Test: `tests/api/messages.test.ts`

**Interfaces:**
- Consumes: `Agent` (Task 3), `ChatMessage`/`ToolCallRequest`/conversation CRUD (Task 5), `buildSystemPrompt`/`buildToolSchemas`/`GROQ_MODEL`/`getGroqClient` (Task 6), `executeTool` (Task 4), `getDb`/`resetDbForTests` (Task 2).
- Produces: `toGroqMessages(agent, history)`, `runChatTurn(client, agent, history, userMessage, handlers?): Promise<ChatMessage[]>` — consumed by the messages route and, indirectly, by the playground UI (Task 11) via the SSE response it powers.

- [ ] **Step 1: Write the failing test for the chat engine**

```ts
// tests/lib/chat.test.ts
import { describe, expect, it } from 'vitest';
import { runChatTurn } from '@/lib/chat';
import type { Agent } from '@/lib/agents';

function makeStream(chunks: any[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const c of chunks) yield c;
    },
  };
}

function contentChunk(text: string) {
  return { choices: [{ delta: { content: text } }] };
}

function toolCallChunk(index: number, id: string | undefined, name: string | undefined, argsChunk: string | undefined) {
  return { choices: [{ delta: { tool_calls: [{ index, id, function: { name, arguments: argsChunk } }] } }] };
}

const agent: Agent = {
  id: 'a1',
  name: 'Test Agent',
  instructions: 'You are a helpful support agent.',
  knowledge: [],
  enabledTools: ['lookup_order'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('runChatTurn', () => {
  it('returns a direct answer when no tool call is needed', async () => {
    const fakeClient = {
      chat: { completions: { create: async () => makeStream([contentChunk('Hello'), contentChunk(' there!')]) } },
    } as any;

    const result = await runChatTurn(fakeClient, agent, [], 'hi');
    expect(result).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Hello there!' },
    ]);
  });

  it('executes a tool call and folds the result into a follow-up turn', async () => {
    let call = 0;
    const fakeClient = {
      chat: {
        completions: {
          create: async () => {
            call += 1;
            if (call === 1) {
              return makeStream([
                toolCallChunk(0, 'call_1', 'lookup_order', '{"order_id":'),
                toolCallChunk(0, undefined, undefined, '"1001"}'),
              ]);
            }
            return makeStream([contentChunk('Your order is shipped.')]);
          },
        },
      },
    } as any;

    const result = await runChatTurn(fakeClient, agent, [], 'where is order 1001?');
    expect(result[0]).toEqual({ role: 'user', content: 'where is order 1001?' });
    expect(result[1].role).toBe('assistant');
    expect(result[1].toolCalls).toEqual([{ id: 'call_1', name: 'lookup_order', arguments: { order_id: '1001' } }]);
    expect(result[2].role).toBe('tool');
    expect(JSON.parse(result[2].content)).toEqual({
      order_id: '1001',
      status: 'shipped',
      item: 'Wireless Mouse',
      eta: '2026-07-05',
    });
    expect(result[3]).toEqual({ role: 'assistant', content: 'Your order is shipped.' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/chat.test.ts`
Expected: FAIL — `Cannot find module '@/lib/chat'`.

- [ ] **Step 3: Write `lib/chat.ts`**

```ts
import type OpenAI from 'openai';
import type { Agent } from './agents';
import type { ChatMessage, ToolCallRequest } from './conversations';
import { buildSystemPrompt, buildToolSchemas, GROQ_MODEL } from './groq';
import { executeTool } from './tools';

type GroqChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

export function toGroqMessages(agent: Agent, history: ChatMessage[]): GroqChatMessage[] {
  const system: GroqChatMessage = { role: 'system', content: buildSystemPrompt(agent) };
  const rest: GroqChatMessage[] = history.map((m): GroqChatMessage => {
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.toolCallId ?? '', content: m.content };
    }
    if (m.role === 'assistant') {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    return { role: 'user', content: m.content };
  });
  return [system, ...rest];
}

export interface StreamHandlers {
  onContentDelta?: (delta: string) => void;
  onToolCallStart?: (name: string) => void;
}

const MAX_TOOL_ITERATIONS = 5;

export async function runChatTurn(
  client: OpenAI,
  agent: Agent,
  history: ChatMessage[],
  userMessage: string,
  handlers: StreamHandlers = {}
): Promise<ChatMessage[]> {
  const newMessages: ChatMessage[] = [{ role: 'user', content: userMessage }];
  const toolSchemas = buildToolSchemas(agent.enabledTools);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const groqMessages = toGroqMessages(agent, [...history, ...newMessages]);
    const stream = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: groqMessages as any,
      tools: toolSchemas.length > 0 ? (toolSchemas as any) : undefined,
      stream: true,
    });

    let content = '';
    const toolCallsByIndex = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of stream as any) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        content += delta.content;
        handlers.onContentDelta?.(delta.content);
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          const existing = toolCallsByIndex.get(idx) ?? { id: '', name: '', args: '' };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) {
            existing.name = tc.function.name;
            handlers.onToolCallStart?.(tc.function.name);
          }
          if (tc.function?.arguments) existing.args += tc.function.arguments;
          toolCallsByIndex.set(idx, existing);
        }
      }
    }

    if (toolCallsByIndex.size > 0) {
      const toolCalls: ToolCallRequest[] = Array.from(toolCallsByIndex.values()).map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: JSON.parse(tc.args || '{}'),
      }));
      newMessages.push({ role: 'assistant', content, toolCalls });
      for (const call of toolCalls) {
        const result = executeTool(call.name, call.arguments);
        newMessages.push({ role: 'tool', content: result, toolCallId: call.id, toolName: call.name });
      }
      continue;
    }

    newMessages.push({ role: 'assistant', content });
    return newMessages;
  }

  newMessages.push({ role: 'assistant', content: 'Sorry, I was unable to complete that after several tool calls.' });
  return newMessages;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/chat.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for the conversations API**

```ts
// tests/api/conversations.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resetDbForTests, getDb } from '@/lib/db';
import { createAgent } from '@/lib/agents';
import { GET, POST } from '@/app/api/agents/[id]/conversations/route';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'studio-conv-api-test-'));
  process.env.STUDIO_DB_PATH = path.join(tempDir, 'test.db');
  resetDbForTests();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('agent conversations API', () => {
  it('creates and lists conversations for an agent', async () => {
    const db = getDb();
    const agent = createAgent(db, { name: 'Test Agent' });

    const createRes = await POST(new Request('http://localhost') as any, { params: { id: agent.id } });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.agentId).toBe(agent.id);

    const listRes = await GET(new Request('http://localhost') as any, { params: { id: agent.id } });
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/api/conversations.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/agents/[id]/conversations/route'`.

- [ ] **Step 7: Write `app/api/agents/[id]/conversations/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createConversation, listConversationsForAgent } from '@/lib/conversations';

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

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/api/conversations.test.ts`
Expected: PASS (1 test).

- [ ] **Step 9: Write the failing test for the messages API**

```ts
// tests/api/messages.test.ts
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resetDbForTests, getDb } from '@/lib/db';
import { createAgent } from '@/lib/agents';
import { createConversation, getConversation } from '@/lib/conversations';

vi.mock('@/lib/groq', async () => {
  const actual = await vi.importActual<typeof import('@/lib/groq')>('@/lib/groq');
  return {
    ...actual,
    getGroqClient: () => ({
      chat: {
        completions: {
          create: async () => ({
            [Symbol.asyncIterator]: async function* () {
              yield { choices: [{ delta: { content: 'Hi there!' } }] };
            },
          }),
        },
      },
    }),
  };
});

const { POST } = await import('@/app/api/conversations/[id]/messages/route');

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'studio-msg-test-'));
  process.env.STUDIO_DB_PATH = path.join(tempDir, 'test.db');
  process.env.GROQ_API_KEY = 'test-key';
  resetDbForTests();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

async function readAllSse(res: Response): Promise<any[]> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events: any[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) events.push(JSON.parse(line.slice(6)));
    }
  }
  return events;
}

describe('POST /api/conversations/[id]/messages', () => {
  it('streams the assistant reply and persists the conversation', async () => {
    const db = getDb();
    const agent = createAgent(db, { name: 'Test Agent', instructions: 'Be helpful.' });
    const conversation = createConversation(db, agent.id);

    const req = new Request('http://localhost/api/conversations/x/messages', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
    });
    const res = await POST(req as any, { params: { id: conversation.id } });
    const events = await readAllSse(res);

    expect(events.some((e) => e.type === 'content' && e.delta === 'Hi there!')).toBe(true);
    const doneEvent = events.find((e) => e.type === 'done');
    expect(doneEvent.messages).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'Hi there!' },
    ]);

    const persisted = getConversation(db, conversation.id);
    expect(persisted?.messages).toEqual(doneEvent.messages);
  });

  it('returns 400 when message is missing', async () => {
    const db = getDb();
    const agent = createAgent(db, { name: 'Test Agent' });
    const conversation = createConversation(db, agent.id);
    const req = new Request('http://localhost/api/conversations/x/messages', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as any, { params: { id: conversation.id } });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- tests/api/messages.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/conversations/[id]/messages/route'`.

- [ ] **Step 11: Write `app/api/conversations/[id]/messages/route.ts`**

```ts
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getConversation, appendMessages } from '@/lib/conversations';
import { getAgent } from '@/lib/agents';
import { getGroqClient } from '@/lib/groq';
import { runChatTurn } from '@/lib/chat';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.message || typeof body.message !== 'string') {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 });
  }

  const db = getDb();
  const conversation = getConversation(db, params.id);
  if (!conversation) return new Response(JSON.stringify({ error: 'conversation not found' }), { status: 404 });
  const agent = getAgent(db, conversation.agentId);
  if (!agent) return new Response(JSON.stringify({ error: 'agent not found' }), { status: 404 });

  let client;
  try {
    client = getGroqClient();
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
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

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- tests/api/messages.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 13: Run the full test suite**

Run: `npm test`
Expected: all tests across all files PASS.

- [ ] **Step 14: Commit**

```bash
git add lib/chat.ts app/api/agents/[id]/conversations app/api/conversations tests/lib/chat.test.ts tests/api/conversations.test.ts tests/api/messages.test.ts
git commit -m "Add chat engine (tool-calling loop) and conversation/message API routes"
```

---

### Task 9: Agents list/create UI page

**Files:**
- Create: `app/agents/page.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/agents` from Task 7.

- [ ] **Step 1: Write `app/agents/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  instructions: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => {
        setAgents(data);
        setLoading(false);
      });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const agent = await res.json();
    setAgents((prev) => [agent, ...prev]);
    setName('');
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold mb-6">Agents</h1>
      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New agent name"
          className="flex-1 border rounded px-3 py-2"
        />
        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Create
        </button>
      </form>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul className="space-y-2">
          {agents.map((agent) => (
            <li key={agent.id} className="border rounded p-3 flex justify-between items-center">
              <span>{agent.name}</span>
              <div className="flex gap-3 text-sm">
                <Link href={`/agents/${agent.id}/edit`} className="underline">
                  Edit
                </Link>
                <Link href={`/agents/${agent.id}/playground`} className="underline">
                  Playground
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, visit `http://localhost:3000/agents`.
Expected: empty list, "Create" adds an agent to the list without a page reload, no console errors.

- [ ] **Step 3: Commit**

```bash
git add app/agents/page.tsx
git commit -m "Add agents list/create UI page"
```

---

### Task 10: Agent edit UI page

**Files:**
- Create: `app/agents/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `GET`/`PUT /api/agents/[id]` from Task 7.

- [ ] **Step 1: Write `app/agents/[id]/edit/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
}

const ALL_TOOLS = [
  { name: 'lookup_order', label: 'Look up order' },
  { name: 'check_refund_policy', label: 'Check refund policy' },
  { name: 'create_ticket', label: 'Create support ticket' },
];

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [knowledge, setKnowledge] = useState<KnowledgeSnippet[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
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
    setKnowledge((prev) => [...prev, { id: crypto.randomUUID(), title: '', content: '' }]);
  }

  function updateKnowledge(index: number, field: 'title' | 'content', value: string) {
    setKnowledge((prev) => prev.map((k, i) => (i === index ? { ...k, [field]: value } : k)));
  }

  function removeKnowledge(index: number) {
    setKnowledge((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTool(toolName: string) {
    setEnabledTools((prev) => (prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]));
  }

  async function handleSave() {
    await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, instructions, knowledge, enabledTools }),
    });
    router.push('/agents');
  }

  if (!loaded) return <p className="p-8">Loading...</p>;

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Edit Agent</h1>

      <div>
        <label className="block font-medium mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block font-medium mb-1">Instructions</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={5}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block font-medium">Knowledge</label>
          <button type="button" onClick={addKnowledge} className="text-sm underline">
            + Add snippet
          </button>
        </div>
        <div className="space-y-3">
          {knowledge.map((k, i) => (
            <div key={k.id} className="border rounded p-3 space-y-2">
              <input
                value={k.title}
                onChange={(e) => updateKnowledge(i, 'title', e.target.value)}
                placeholder="Title"
                className="w-full border rounded px-2 py-1"
              />
              <textarea
                value={k.content}
                onChange={(e) => updateKnowledge(i, 'content', e.target.value)}
                placeholder="Content"
                rows={3}
                className="w-full border rounded px-2 py-1"
              />
              <button type="button" onClick={() => removeKnowledge(i)} className="text-sm text-red-600 underline">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium mb-1">Tools</label>
        <div className="space-y-1">
          {ALL_TOOLS.map((tool) => (
            <label key={tool.name} className="flex items-center gap-2">
              <input type="checkbox" checked={enabledTools.includes(tool.name)} onChange={() => toggleTool(tool.name)} />
              {tool.label}
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSave} className="bg-black text-white rounded px-4 py-2">
        Save
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, create an agent from `/agents`, click "Edit", add a knowledge snippet, enable a tool, click "Save".
Expected: redirected back to `/agents`; reopening "Edit" shows the saved instructions/knowledge/tools; no console errors.

- [ ] **Step 3: Commit**

```bash
git add app/agents/[id]/edit/page.tsx
git commit -m "Add agent edit UI page"
```

---

### Task 11: Playground UI page

**Files:**
- Create: `app/agents/[id]/playground/page.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/agents/[id]/conversations` from Task 8, `POST /api/conversations/[id]/messages` (SSE) from Task 8.

- [ ] **Step 1: Write `app/agents/[id]/playground/page.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
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
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const streamingContent = useRef('');

  useEffect(() => {
    fetch(`/api/agents/${id}/conversations`)
      .then((res) => res.json())
      .then((list: ConversationSummary[]) => setConversations(list));
  }, [id]);

  async function startNewConversation() {
    const res = await fetch(`/api/agents/${id}/conversations`, { method: 'POST' });
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
    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setStreaming(true);
    streamingContent.current = '';

    const res = await fetch(`/api/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage.content }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        const event = JSON.parse(part.slice(6));
        if (event.type === 'content') {
          streamingContent.current += event.delta;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: streamingContent.current };
            return next;
          });
        } else if (event.type === 'tool_call') {
          setMessages((prev) => [...prev.slice(0, -1), { role: 'tool', content: '', toolName: event.name }, prev[prev.length - 1]]);
        } else if (event.type === 'done') {
          setMessages(event.messages);
        }
      }
    }
    setStreaming(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-8 grid grid-cols-4 gap-6">
      <aside className="col-span-1 space-y-2">
        <button onClick={startNewConversation} className="w-full bg-black text-white rounded px-3 py-2 text-sm">
          New chat
        </button>
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => loadConversation(c.id)}
                className={`text-left w-full text-sm underline ${activeId === c.id ? 'font-semibold' : ''}`}
              >
                {new Date(c.createdAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="col-span-3 flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto space-y-3 border rounded p-4">
          {messages.map((m, i) =>
            m.role === 'tool' ? (
              <div key={i} className="text-xs text-gray-500 italic">
                {'🔧'} called `{m.toolName}`
              </div>
            ) : (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span className="inline-block bg-gray-100 rounded px-3 py-2">{m.content}</span>
              </div>
            )
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={!activeId || streaming}
            placeholder={activeId ? 'Type a message...' : 'Start a new chat first'}
            className="flex-1 border rounded px-3 py-2"
          />
          <button onClick={sendMessage} disabled={!activeId || streaming} className="bg-black text-white rounded px-4 py-2">
            Send
          </button>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, open an agent's playground, click "New chat", send a message.
Expected: assistant reply streams in visibly token-by-token; no console errors. (Full scenario coverage, including tool calls and reload, happens in Task 12.)

- [ ] **Step 3: Commit**

```bash
git add app/agents/[id]/playground/page.tsx
git commit -m "Add playground UI page with streaming chat"
```

---

### Task 12: End-to-end manual verification

**Files:** none (verification only).

- [ ] **Step 1: Set up the API key**

Copy `.env.local.example` to `.env.local` and fill in a real `GROQ_API_KEY`.

Run: `cp .env.local.example .env.local` then edit the file to add the key.

- [ ] **Step 2: Boot the app**

Run: `npm run dev`
Expected: no errors in the terminal; `http://localhost:3000` redirects to `/agents`.

- [ ] **Step 3: Create an agent with knowledge and a tool**

On `/agents`, create an agent named "Support Bot". Go to its Edit page, set instructions to `You are a helpful customer support agent. Use tools when relevant.`, add a knowledge snippet titled "Shipping" with content "We ship all orders within 2 business days.", enable the `lookup_order` tool, and Save.

- [ ] **Step 4: Verify knowledge-grounded answers**

In the playground, start a new chat and ask: "How long does shipping take?"
Expected: the reply mentions "2 business days" (from the knowledge snippet), streamed visibly. No console errors (check via browser devtools).

- [ ] **Step 5: Verify tool use**

In the same chat, ask: "What's the status of order 1001?"
Expected: a "🔧 called `lookup_order`" line appears, followed by an assistant reply mentioning the order is shipped (per the fixture data in `lib/tools.ts`).

- [ ] **Step 6: Verify transcript persistence**

Refresh the browser page. Click the conversation in the sidebar.
Expected: the full transcript (user messages, tool call markers, assistant replies) reloads correctly.

- [ ] **Step 7: Record the result**

If all five checks above pass, mark Task 1 ("Build Agent Studio (product 1/7)") as completed in the task tracker. If any check fails, note which one and fix before proceeding to the next product area (Agent Data Platform).
