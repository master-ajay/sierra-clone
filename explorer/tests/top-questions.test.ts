import { describe, it, expect } from 'vitest'
import { computeTopQuestions } from '../lib/top-questions'
import type { AdpMessage } from '../lib/adp'

const messages: AdpMessage[] = [
  { message_id: 'm1', session_id: 's1', role: 'user', content: 'How do I track my order?', created_at: '2026-07-01T10:00:00Z', metadata: {} },
  { message_id: 'm2', session_id: 's1', role: 'assistant', content: 'You can track it here.', created_at: '2026-07-01T10:01:00Z', metadata: {} },
  { message_id: 'm3', session_id: 's2', role: 'user', content: 'How do I track my order?', created_at: '2026-07-02T09:00:00Z', metadata: {} },
  { message_id: 'm4', session_id: 's3', role: 'user', content: 'How do I track my order?', created_at: '2026-07-03T08:00:00Z', metadata: {} },
  { message_id: 'm5', session_id: 's4', role: 'user', content: 'What is the return policy?', created_at: '2026-07-03T09:00:00Z', metadata: {} },
  { message_id: 'm6', session_id: 's5', role: 'user', content: 'What is the return policy?', created_at: '2026-07-03T10:00:00Z', metadata: {} },
  { message_id: 'm7', session_id: 's6', role: 'user', content: 'Cancel my subscription', created_at: '2026-07-03T11:00:00Z', metadata: {} },
]

describe('computeTopQuestions', () => {
  it('groups by normalized content', () => {
    const result = computeTopQuestions(messages, 10)
    const tracking = result.find(q => q.question.includes('track my order'))
    expect(tracking).toBeDefined()
    expect(tracking?.count).toBe(3)
  })

  it('sorts by count descending', () => {
    const result = computeTopQuestions(messages, 10)
    expect(result[0].count).toBeGreaterThanOrEqual(result[1].count)
    expect(result[1].count).toBeGreaterThanOrEqual(result[2].count)
  })

  it('excludes assistant messages', () => {
    const result = computeTopQuestions(messages, 10)
    const assistantContent = result.find(q => q.question.includes('track it here'))
    expect(assistantContent).toBeUndefined()
  })

  it('respects limit', () => {
    const result = computeTopQuestions(messages, 2)
    expect(result).toHaveLength(2)
  })

  it('normalizes case and punctuation', () => {
    const msgs: AdpMessage[] = [
      { message_id: 'a1', session_id: 's1', role: 'user', content: 'Hello!', created_at: '2026-07-01T00:00:00Z', metadata: {} },
      { message_id: 'a2', session_id: 's2', role: 'user', content: 'hello', created_at: '2026-07-01T01:00:00Z', metadata: {} },
      { message_id: 'a3', session_id: 's3', role: 'user', content: 'HELLO', created_at: '2026-07-01T02:00:00Z', metadata: {} },
    ]
    const result = computeTopQuestions(msgs, 10)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
  })

  it('includes example_session_id', () => {
    const result = computeTopQuestions(messages, 10)
    const tracking = result.find(q => q.question.includes('track my order'))!
    expect(tracking.example_session_id).toBeTruthy()
  })

  it('returns empty array for no user messages', () => {
    const assistantOnly: AdpMessage[] = [
      { message_id: 'a1', session_id: 's1', role: 'assistant', content: 'Hello!', created_at: '2026-07-01T00:00:00Z', metadata: {} },
    ]
    expect(computeTopQuestions(assistantOnly, 10)).toHaveLength(0)
  })
})
