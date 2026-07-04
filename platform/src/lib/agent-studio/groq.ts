import OpenAI from 'openai';
import type { Agent } from './agents';
import { TOOLS } from './tools';

export function getGroqClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to .env.local.');
  }
  return new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
}

export function buildSystemPrompt(agent: Agent): string {
  const knowledgeText = agent.knowledge.map((k) => `### ${k.title}\n${k.content}`).join('\n\n');
  return [agent.instructions, knowledgeText ? `\nRelevant knowledge:\n${knowledgeText}` : ''].join('\n').trim();
}

export function buildToolSchemas(enabledToolNames: string[]) {
  return TOOLS.filter((t) => enabledToolNames.includes(t.name)).map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
