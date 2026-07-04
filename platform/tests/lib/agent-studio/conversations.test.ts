import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../../../src/lib/agent-studio/db';
import {
  createConversation,
  getConversation,
  listConversationsForAgent,
  appendMessages,
} from '../../../src/lib/agent-studio/conversations';

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
