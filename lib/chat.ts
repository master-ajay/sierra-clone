import type OpenAI from 'openai';
import type { Agent } from './agents';
import type { ChatMessage, ToolCallRequest } from './conversations';
import { buildSystemPrompt, buildToolSchemas, GROQ_MODEL } from './groq';
import { executeTool } from './tools';

type GroqChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

export function toGroqMessages(agent: Agent, history: ChatMessage[]): GroqChatMessage[] {
  const system: GroqChatMessage = { role: 'system', content: buildSystemPrompt(agent) };
  const rest: GroqChatMessage[] = history.map((m): GroqChatMessage => {
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.toolCallId ?? '', content: m.content };
    }
    if (m.role === 'assistant') {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    return { role: 'user', content: m.content };
  });
  return [system, ...rest];
}

export interface StreamHandlers {
  onContentDelta?: (delta: string) => void;
  onToolCallStart?: (name: string) => void;
}

const MAX_TOOL_ITERATIONS = 5;

export async function runChatTurn(
  client: OpenAI,
  agent: Agent,
  history: ChatMessage[],
  userMessage: string,
  handlers: StreamHandlers = {}
): Promise<ChatMessage[]> {
  const newMessages: ChatMessage[] = [{ role: 'user', content: userMessage }];
  const toolSchemas = buildToolSchemas(agent.enabledTools);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const groqMessages = toGroqMessages(agent, [...history, ...newMessages]);
    const stream = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: groqMessages as any,
      tools: toolSchemas.length > 0 ? (toolSchemas as any) : undefined,
      stream: true,
    });

    let content = '';
    const toolCallsByIndex = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of stream as any) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        content += delta.content;
        handlers.onContentDelta?.(delta.content);
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          const existing = toolCallsByIndex.get(idx) ?? { id: '', name: '', args: '' };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) {
            existing.name = tc.function.name;
            handlers.onToolCallStart?.(tc.function.name);
          }
          if (tc.function?.arguments) existing.args += tc.function.arguments;
          toolCallsByIndex.set(idx, existing);
        }
      }
    }

    if (toolCallsByIndex.size > 0) {
      const toolCalls: ToolCallRequest[] = Array.from(toolCallsByIndex.values()).map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: JSON.parse(tc.args || '{}'),
      }));
      newMessages.push({ role: 'assistant', content, toolCalls });
      for (const call of toolCalls) {
        const result = executeTool(call.name, call.arguments);
        newMessages.push({ role: 'tool', content: result, toolCallId: call.id, toolName: call.name });
      }
      continue;
    }

    newMessages.push({ role: 'assistant', content });
    return newMessages;
  }

  newMessages.push({ role: 'assistant', content: 'Sorry, I was unable to complete that after several tool calls.' });
  return newMessages;
}
