import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../../../src/lib/agent-studio/db';

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
