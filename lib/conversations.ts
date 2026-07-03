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
