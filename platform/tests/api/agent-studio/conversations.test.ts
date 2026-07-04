import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resetDbForTests, getDb } from '@/lib/agent-studio/db';
import { createAgent } from '@/lib/agent-studio/agents';
import { GET, POST } from '@/app/api/agent-studio/agents/[id]/conversations/route';

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

    const createRes = await POST(new Request('http://localhost') as any, { params: Promise.resolve({ id: agent.id }) });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.agentId).toBe(agent.id);

    const listRes = await GET(new Request('http://localhost') as any, { params: Promise.resolve({ id: agent.id }) });
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });
});
