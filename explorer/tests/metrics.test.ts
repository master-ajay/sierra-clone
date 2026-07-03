import { describe, it, expect } from 'vitest'
import { computeMetrics } from '../lib/metrics'
import type { AdpSession, AdpMessage } from '../lib/adp'

const NOW = new Date()
const TODAY = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()))

function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

const sessions: AdpSession[] = [
  { session_id: 's1', user_id: 'u1', started_at: daysAgo(0), last_activity: daysAgo(0), message_count: 3 },
  { session_id: 's2', user_id: 'u1', started_at: daysAgo(3), last_activity: daysAgo(3), message_count: 2 },
  { session_id: 's3', user_id: 'u2', started_at: daysAgo(31), last_activity: daysAgo(31), message_count: 1 },
]

const messages: AdpMessage[] = [
  {
    message_id: 'm1', session_id: 's1', role: 'user',
    content: 'Hello', created_at: daysAgo(0), metadata: {},
  },
  {
    message_id: 'm2', session_id: 's1', role: 'assistant',
    content: 'Hi there', created_at: daysAgo(0),
    metadata: { confidence_score: 0.9, guardrail_passed: true },
  },
  {
    message_id: 'm3', session_id: 's1', role: 'assistant',
    content: 'Response', created_at: daysAgo(0),
    metadata: { confidence_score: 0.4, guardrail_passed: false },
  },
  {
    message_id: 'm4', session_id: 's2', role: 'user',
    content: 'Question', created_at: daysAgo(3), metadata: {},
  },
  {
    message_id: 'm5', session_id: 's2', role: 'assistant',
    content: 'Answer', created_at: daysAgo(3),
    metadata: { confidence_score: 0.7, guardrail_passed: true },
  },
  {
    message_id: 'm6', session_id: 's3', role: 'user',
    content: 'Old', created_at: daysAgo(31), metadata: {},
  },
]

describe('computeMetrics', () => {
  it('filters sessions within 7d window', () => {
    const result = computeMetrics('7d', sessions, messages)
    expect(result.total_sessions).toBe(2)
    expect(result.window).toBe('7d')
  })

  it('counts total messages in window', () => {
    const result = computeMetrics('7d', sessions, messages)
    expect(result.total_messages).toBe(5)
  })

  it('computes avg_confidence_score from assistant turns only', () => {
    const result = computeMetrics('7d', sessions, messages)
    // scored: 0.9, 0.4, 0.7 → avg = (0.9+0.4+0.7)/3 = 0.667
    expect(result.avg_confidence_score).toBeCloseTo((0.9 + 0.4 + 0.7) / 3, 5)
  })

  it('computes guardrail_failure_rate', () => {
    const result = computeMetrics('7d', sessions, messages)
    // 3 assistant turns with guardrail, 1 failed → 1/3
    expect(result.guardrail_failure_rate).toBeCloseTo(1 / 3, 5)
  })

  it('excludes sessions outside window', () => {
    const result = computeMetrics('7d', sessions, messages)
    expect(result.total_sessions).toBe(2)
    const allSessionIds = result.sessions_per_day.flatMap(() => [])
    expect(allSessionIds.length).toBe(0)
  })

  it('returns null avg_confidence_score when no scored turns', () => {
    const noScored: AdpMessage[] = [
      { message_id: 'x1', session_id: 's1', role: 'user', content: 'hi', created_at: daysAgo(0), metadata: {} },
    ]
    const result = computeMetrics('7d', sessions.slice(0, 1), noScored)
    expect(result.avg_confidence_score).toBeNull()
  })

  it('returns null guardrail_failure_rate when no guardrail data', () => {
    const noGuardrail: AdpMessage[] = [
      { message_id: 'x1', session_id: 's1', role: 'assistant', content: 'hi', created_at: daysAgo(0), metadata: {} },
    ]
    const result = computeMetrics('7d', sessions.slice(0, 1), noGuardrail)
    expect(result.guardrail_failure_rate).toBeNull()
  })

  it('groups sessions_per_day by UTC date', () => {
    const result = computeMetrics('7d', sessions, messages)
    const total = result.sessions_per_day.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(result.total_sessions)
  })

  it('today window filters to current day only', () => {
    const result = computeMetrics('today', sessions, messages)
    expect(result.total_sessions).toBe(1)
  })

  it('30d window includes sessions up to 30 days ago', () => {
    const result = computeMetrics('30d', sessions, messages)
    expect(result.total_sessions).toBe(2)
  })
})
