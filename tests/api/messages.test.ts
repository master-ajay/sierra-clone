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
