import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../../../src/lib/agent-studio/db';
import { createAgent, getAgent, listAgents, updateAgent } from '../../../src/lib/agent-studio/agents';

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
