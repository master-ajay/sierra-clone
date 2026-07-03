import { describe, expect, it } from 'vitest';
import { executeTool, getToolByName } from '@/lib/tools';

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
});
