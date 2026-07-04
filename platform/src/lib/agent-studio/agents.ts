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
