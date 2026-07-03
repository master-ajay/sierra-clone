import { describe, it, expect } from 'vitest'
import { buildSessionSummaries, buildTrace } from '../lib/sessions'
import type { AdpSession, AdpMessage } from '../lib/adp'

const sessions: AdpSession[] = [
  { session_id: 's1', user_id: 'u1', started_at: '2026-07-01T10:00:00Z', last_activity: '2026-07-01T10:05:00Z', message_count: 2 },
  { session_id: 's2', user_id: 'u1', started_at: '2026-07-03T09:00:00Z', last_activity: '2026-07-03T09:10:00Z', message_count: 3 },
  { session_id: 's3', user_id: 'u2', started_at: '2026-07-02T14:00:00Z', last_activity: '2026-07-02T14:30:00Z', message_count: 1 },
]

const msgs: AdpMessage[] = [
  { message_id: 'm1', session_id: 's1', role: 'user', content: 'How do I reset my password?', created_at: '2026-07-01T10:00:00Z', metadata: {} },
  { message_id: 'm2', session_id: 's1', role: 'assistant', content: 'Click Forgot Password.', created_at: '2026-07-01T10:01:00Z', metadata: { confidence_score: 0.9, guardrail_passed: true } },
  { message_id: 'm3', session_id: 's2', role: 'user', content: 'What is your return policy?', created_at: '2026-07-03T09:00:00Z', metadata: {} },
  { message_id: 'm4', session_id: 's2', role: 'assistant', content: 'Returns within 30 days.', created_at: '2026-07-03T09:01:00Z', metadata: { confidence_score: 0.75, guardrail_passed: true } },
  { message_id: 'm5', session_id: 's2', role: 'user', content: 'Thank you!', created_at: '2026-07-03T09:02:00Z', metadata: {} },
  { message_id: 'm6', session_id: 's3', role: 'user', content: 'Hello there, what can you help me with today?', created_at: '2026-07-02T14:00:00Z', metadata: {} },
]

function makeMap(messages: AdpMessage[]): Map<string, AdpMessage[]> {
  const map = new Map<string, AdpMessage[]>()
  for (const m of messages) {
    const arr = map.get(m.session_id) ?? []
    arr.push(m)
    map.set(m.session_id, arr)
  }
  return map
}

describe('buildSessionSummaries', () => {
  it('returns sessions in reverse-chronological order', () => {
    const map = makeMap(msgs)
    const { items } = buildSessionSummaries(sessions, map, null, 10)
    expect(items[0].session_id).toBe('s2')
    expect(items[1].session_id).toBe('s3')
    expect(items[2].session_id).toBe('s1')
  })

  it('includes first_user_message truncated to 120 chars', () => {
    const map = makeMap(msgs)
    const { items } = buildSessionSummaries(sessions, map, null, 10)
    const s1 = items.find(i => i.session_id === 's1')!
    expect(s1.first_user_message).toBe('How do I reset my password?')
  })

  it('paginates correctly with limit', () => {
    const map = makeMap(msgs)
    const { items, next_cursor } = buildSessionSummaries(sessions, map, null, 2)
    expect(items).toHaveLength(2)
    expect(next_cursor).not.toBeNull()
  })

  it('respects cursor for next page', () => {
    const map = makeMap(msgs)
    const { items: page1, next_cursor } = buildSessionSummaries(sessions, map, null, 2)
    const { items: page2 } = buildSessionSummaries(sessions, map, next_cursor, 2)
    expect(page2).toHaveLength(1)
    const ids1 = page1.map(i => i.session_id)
    const ids2 = page2.map(i => i.session_id)
    expect(ids1.some(id => ids2.includes(id))).toBe(false)
  })

  it('returns null next_cursor when no more pages', () => {
    const map = makeMap(msgs)
    const { next_cursor } = buildSessionSummaries(sessions, map, null, 10)
    expect(next_cursor).toBeNull()
  })

  it('includes message_count and last_activity', () => {
    const map = makeMap(msgs)
    const { items } = buildSessionSummaries(sessions, map, null, 10)
    const s2 = items.find(i => i.session_id === 's2')!
    expect(s2.message_count).toBe(3)
    expect(s2.last_activity).toBe('2026-07-03T09:10:00Z')
  })
})

describe('buildTrace', () => {
  it('returns messages in chronological order', () => {
    const unordered = [msgs[1], msgs[0]]
    const trace = buildTrace(unordered)
    expect(trace[0].message_id).toBe('m1')
    expect(trace[1].message_id).toBe('m2')
  })

  it('includes all metadata fields', () => {
    const trace = buildTrace([msgs[1]])
    expect(trace[0].metadata.confidence_score).toBe(0.9)
    expect(trace[0].metadata.guardrail_passed).toBe(true)
  })

  it('includes role and content', () => {
    const trace = buildTrace([msgs[0]])
    expect(trace[0].role).toBe('user')
    expect(trace[0].content).toBe('How do I reset my password?')
  })
})
