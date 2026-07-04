import { describe, it, expect } from 'vitest'
import { computeRollup } from '../lib/rollups'
import type { AdpSession, AdpMessage } from '../lib/adp'
import type { Channel } from '../lib/channels'

const channel: Channel = {
  channel_id: 'chan-1',
  agent_id: 'agent-1',
  adp_user_id: 'adp-user-1',
  name: 'Website widget',
  type: 'widget',
  status: 'active',
}

const sessions: AdpSession[] = [
  { session_id: 's1', user_id: 'adp-user-1', started_at: '2026-07-04T10:00:00Z', last_activity: '2026-07-04T10:05:00Z', message_count: 2 },
  { session_id: 's2', user_id: 'adp-user-1', started_at: '2026-07-04T12:00:00Z', last_activity: '2026-07-04T12:05:00Z', message_count: 2 },
  { session_id: 's3', user_id: 'adp-user-1', started_at: '2026-07-03T09:00:00Z', last_activity: '2026-07-03T09:05:00Z', message_count: 1 },
]

const messages: AdpMessage[] = [
  { message_id: 'm1', session_id: 's1', role: 'user', content: 'hi', created_at: '2026-07-04T10:00:00Z', metadata: {} },
  { message_id: 'm2', session_id: 's1', role: 'assistant', content: 'hello', created_at: '2026-07-04T10:01:00Z', metadata: { confidence_score: 0.9, guardrail_passed: true } },
  { message_id: 'm3', session_id: 's2', role: 'user', content: 'hi again', created_at: '2026-07-04T12:00:00Z', metadata: {} },
  { message_id: 'm4', session_id: 's2', role: 'assistant', content: 'hello again', created_at: '2026-07-04T12:01:00Z', metadata: { confidence_score: 0.5, guardrail_passed: false } },
  { message_id: 'm5', session_id: 's3', role: 'user', content: 'old', created_at: '2026-07-03T09:00:00Z', metadata: {} },
]

describe('computeRollup', () => {
  it('scopes to sessions started on the given date only', () => {
    const row = computeRollup('2026-07-04', channel, sessions, messages)
    expect(row.session_count).toBe(2)
  })

  it('counts messages only from in-scope sessions', () => {
    const row = computeRollup('2026-07-04', channel, sessions, messages)
    expect(row.message_count).toBe(4)
  })

  it('carries agent_id and channel_id from the channel', () => {
    const row = computeRollup('2026-07-04', channel, sessions, messages)
    expect(row.agent_id).toBe('agent-1')
    expect(row.channel_id).toBe('chan-1')
  })

  it('averages confidence score across assistant turns with a score', () => {
    const row = computeRollup('2026-07-04', channel, sessions, messages)
    expect(row.avg_confidence_score).toBeCloseTo(0.7)
  })

  it('computes guardrail pass rate across assistant turns with a guardrail result', () => {
    const row = computeRollup('2026-07-04', channel, sessions, messages)
    expect(row.guardrail_pass_rate).toBeCloseTo(0.5)
  })

  it('returns nulls for confidence/guardrail when no scored turns exist that day', () => {
    const row = computeRollup('2026-07-03', channel, sessions, messages)
    expect(row.session_count).toBe(1)
    expect(row.avg_confidence_score).toBeNull()
    expect(row.guardrail_pass_rate).toBeNull()
  })

  it('returns a zeroed row for a date with no activity', () => {
    const row = computeRollup('2026-01-01', channel, sessions, messages)
    expect(row.session_count).toBe(0)
    expect(row.message_count).toBe(0)
    expect(row.avg_confidence_score).toBeNull()
  })
})
