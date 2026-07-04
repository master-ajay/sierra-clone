import { NextRequest } from 'next/server';
import { getDb } from '@/lib/agent-studio/db';
import { getConversation, appendMessages } from '@/lib/agent-studio/conversations';
import { getAgent } from '@/lib/agent-studio/agents';
import { getGroqClient } from '@/lib/agent-studio/groq';
import { runChatTurn } from '@/lib/agent-studio/chat';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!body.message || typeof body.message !== 'string') {
    return new Response(JSON.stringify({ error: { code: 'validation_error', message: 'message is required', details: {} } }), { status: 400 });
  }

  const db = getDb();
  const conversation = getConversation(db, id);
  if (!conversation) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'conversation not found', details: {} } }), { status: 404 });
  const agent = getAgent(db, conversation.agentId);
  if (!agent) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'agent not found', details: {} } }), { status: 404 });

  let client;
  try {
    client = getGroqClient();
  } catch (err) {
    return new Response(JSON.stringify({ error: { code: 'configuration_error', message: (err as Error).message, details: {} } }), { status: 500 });
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
        appendMessages(db, id, newMessages);
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
