import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getConversation, appendMessages } from '@/lib/conversations';
import { getAgent } from '@/lib/agents';
import { getGroqClient } from '@/lib/groq';
import { runChatTurn } from '@/lib/chat';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.message || typeof body.message !== 'string') {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 });
  }

  const db = getDb();
  const conversation = getConversation(db, params.id);
  if (!conversation) return new Response(JSON.stringify({ error: 'conversation not found' }), { status: 404 });
  const agent = getAgent(db, conversation.agentId);
  if (!agent) return new Response(JSON.stringify({ error: 'agent not found' }), { status: 404 });

  let client;
  try {
    client = getGroqClient();
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        const newMessages = await runChatTurn(client, agent, conversation.messages, body.message, {
          onContentDelta: (delta) => send({ type: 'content', delta }),
          onToolCallStart: (name) => send({ type: 'tool_call', name }),
        });
        appendMessages(db, params.id, newMessages);
        send({ type: 'done', messages: newMessages });
      } catch (err) {
        send({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
