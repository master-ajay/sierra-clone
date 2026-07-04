import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resetDbForTests, getDb } from '@/lib/agent-studio/db';
import { createAgent } from '@/lib/agent-studio/agents';
import { GET, PUT } from '@/app/api/agent-studio/agents/[id]/route';

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
    const res = await GET(new Request('http://localhost') as any, { params: Promise.resolve({ id: agent.id }) });
    const body = await res.json();
    expect(body.id).toBe(agent.id);
  });

  it('returns 404 for a missing agent', async () => {
    const res = await GET(new Request('http://localhost') as any, { params: Promise.resolve({ id: 'nope' }) });
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
      { params: Promise.resolve({ id: agent.id }) }
    );
    const body = await res.json();
    expect(body.instructions).toBe('New instructions');
  });
});
