import { describe, expect, it } from 'vitest';
import { executeTool, getToolByName, TOOLS } from '../../../src/lib/agent-studio/tools';

describe('tools', () => {
  it('looks up a known order', () => {
    const result = JSON.parse(executeTool('lookup_order', { order_id: '1001' }));
    expect(result).toEqual({ order_id: '1001', status: 'shipped', item: 'Wireless Mouse', eta: '2026-07-05' });
  });

  it('returns an error for an unknown order', () => {
    const result = JSON.parse(executeTool('lookup_order', { order_id: '9999' }));
    expect(result.error).toContain('9999');
  });

  it('returns a default refund policy for an unlisted category', () => {
    const result = JSON.parse(executeTool('check_refund_policy', { product_category: 'toys' }));
    expect(result.policy).toContain('30 days');
  });

  it('creates a ticket and returns an id', () => {
    const result = JSON.parse(executeTool('create_ticket', { summary: 'Broken item', priority: 'high' }));
    expect(result.ticket_id).toMatch(/^TCK-/);
    expect(result.status).toBe('created');
  });

  it('returns an error for an unknown tool name', () => {
    const result = JSON.parse(executeTool('does_not_exist', {}));
    expect(result.error).toContain('Unknown tool');
  });

  it('exposes lookup_order via getToolByName', () => {
    expect(getToolByName('lookup_order')?.name).toBe('lookup_order');
  });

  it('returns error JSON when tool throws (missing required arg)', () => {
    // This test verifies the try/catch in executeTool catches tool errors.
    // We monkey-patch a tool's execute method to throw, call executeTool,
    // and verify it returns JSON with an error field instead of throwing.

    const toolIndex = 0; // Patch the first tool (lookup_order)
    const originalExecute = TOOLS[toolIndex].execute;

    try {
      // Make the tool throw an error
      TOOLS[toolIndex].execute = () => {
        throw new Error('Simulated tool execution failure');
      };

      // Call executeTool - it should catch the error and return JSON
      const result = JSON.parse(executeTool(TOOLS[toolIndex].name, {}));

      // Verify we got an error JSON response, not a thrown exception
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Simulated tool execution failure');
      expect(typeof result.error).toBe('string');
    } finally {
      // Restore the original execute method
      TOOLS[toolIndex].execute = originalExecute;
    }
  });
});
