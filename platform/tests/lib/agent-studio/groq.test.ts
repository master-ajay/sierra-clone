import { describe, expect, it, afterEach } from 'vitest';
import { buildSystemPrompt, buildToolSchemas, getGroqClient } from '../../../src/lib/agent-studio/groq';
import type { Agent } from '../../../src/lib/agent-studio/agents';

const agent: Agent = {
  id: 'a1',
  name: 'Test',
  instructions: 'Be concise.',
  knowledge: [{ id: 'k1', title: 'Shipping', content: 'Ships in 3 days.' }],
  enabledTools: ['lookup_order', 'create_ticket'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('buildSystemPrompt', () => {
  it('includes instructions and knowledge titles/content', () => {
    const prompt = buildSystemPrompt(agent);
    expect(prompt).toContain('Be concise.');
    expect(prompt).toContain('Shipping');
    expect(prompt).toContain('Ships in 3 days.');
  });
});

describe('buildToolSchemas', () => {
  it('only includes enabled tools', () => {
    const schemas = buildToolSchemas(['lookup_order']);
    expect(schemas).toHaveLength(1);
    expect(schemas[0].function.name).toBe('lookup_order');
  });
});

describe('getGroqClient', () => {
  const original = process.env.GROQ_API_KEY;
  afterEach(() => {
    process.env.GROQ_API_KEY = original;
  });

  it('throws a clear error when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => getGroqClient()).toThrow('GROQ_API_KEY is not set');
  });
});
