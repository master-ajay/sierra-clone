import { describe, it, expect } from 'vitest'
import { mergeSearchResults } from '../lib/search'
import type { AdpSearchResult } from '../lib/adp'

const results: AdpSearchResult[] = [
  { message_id: 'r1', session_id: 's1', role: 'user', content: 'How do I track my order?', created_at: '2026-07-03T10:00:00Z' },
  { message_id: 'r2', session_id: 's2', role: 'assistant', content: 'You can track your order in the app.', created_at: '2026-07-01T09:00:00Z' },
  { message_id: 'r3', session_id: 's3', role: 'user', content: 'Order status please', created_at: '2026-07-02T08:00:00Z' },
]

describe('mergeSearchResults', () => {
  it('sorts results by created_at descending', () => {
    const { items } = mergeSearchResults(results, null, 10)
    expect(items[0].message_id).toBe('r1')
    expect(items[1].message_id).toBe('r3')
    expect(items[2].message_id).toBe('r2')
  })

  it('paginates with limit', () => {
    const { items, next_cursor } = mergeSearchResults(results, null, 2)
    expect(items).toHaveLength(2)
    expect(next_cursor).not.toBeNull()
  })

  it('respects cursor for next page', () => {
    const { items: page1, next_cursor } = mergeSearchResults(results, null, 2)
    const { items: page2 } = mergeSearchResults(results, next_cursor, 2)
    expect(page2).toHaveLength(1)
    const ids1 = page1.map(i => i.message_id)
    const ids2 = page2.map(i => i.message_id)
    expect(ids1.some(id => ids2.includes(id))).toBe(false)
  })

  it('returns null next_cursor when no more pages', () => {
    const { next_cursor } = mergeSearchResults(results, null, 10)
    expect(next_cursor).toBeNull()
  })

  it('returns all required fields', () => {
    const { items } = mergeSearchResults(results, null, 10)
    expect(items[0]).toMatchObject({
      message_id: 'r1',
      session_id: 's1',
      role: 'user',
      content: 'How do I track my order?',
      created_at: '2026-07-03T10:00:00Z',
    })
  })

  it('handles empty results', () => {
    const { items, next_cursor } = mergeSearchResults([], null, 10)
    expect(items).toHaveLength(0)
    expect(next_cursor).toBeNull()
  })
})
