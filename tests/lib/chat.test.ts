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
