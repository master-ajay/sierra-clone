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
