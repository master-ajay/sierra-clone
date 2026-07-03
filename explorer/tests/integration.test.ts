import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createTestDb } from '../lib/db'
import { computeMetrics } from '../lib/metrics'
import { buildSessionSummaries, buildTrace } from '../lib/sessions'
import { mergeSearchResults } from '../lib/search'
import { computeTopQuestions } from '../lib/top-questions'
import type Database from 'better-sqlite3'
import type { AdpSession, AdpMessage, AdpSearchResult } from '../lib/adp'

let db: Database.Database

beforeEach(() => {
  db = createTestDb(join(tmpdir(), `explorer-int-${randomUUID()}.db`))
  vi.resetAllMocks()
})

afterEach(() => {
  db.close()
})

const NOW = new Date()
const TODAY = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()))

function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

const USER_ID = 'user-abc-123'

const SESSIONS: AdpSession[] = [
  {
    session_id: 'sess-001',
    user_id: USER_ID,
    started_at: daysAgo(1),
    last_activity: daysAgo(1),
    message_count: 4,
  },
  {
    session_id: 'sess-002',
    user_id: USER_ID,
    started_at: daysAgo(2),
    last_activity: daysAgo(2),
    message_count: 2,
  },
]

const MESSAGES: AdpMessage[] = [
  {
    message_id: 'msg-001',
    session_id: 'sess-001',
    role: 'user',
    content: 'What is your return policy?',
    created_at: daysAgo(1),
    metadata: {},
  },
  {
    message_id: 'msg-002',
    session_id: 'sess-001',
    role: 'assistant',
    content: 'Our return policy allows returns within 30 days.',
    created_at: daysAgo(1),
    metadata: {
      confidence_score: 0.92,
      guardrail_passed: true,
      citations: ['https://example.com/returns'],
    },
  },
  {
    message_id: 'msg-003',
    session_id: 'sess-001',
    role: 'user',
    content: 'What is your return policy?',
    created_at: daysAgo(1),
    metadata: {},
  },
  {
    message_id: 'msg-004',
    session_id: 'sess-001',
    role: 'assistant',
    content: 'Please see our returns page.',
    created_at: daysAgo(1),
    metadata: {
      confidence_score: 0.55,
      guardrail_passed: false,
    },
  },
  {
    message_id: 'msg-005',
    session_id: 'sess-002',
    role: 'user',
    content: 'How do I cancel my subscription?',
    created_at: daysAgo(2),
    metadata: {},
  },
  {
    message_id: 'msg-006',
    session_id: 'sess-002',
    role: 'assistant',
    content: 'Go to Settings → Subscription → Cancel.',
    created_at: daysAgo(2),
    metadata: {
      confidence_score: 0.88,
      guardrail_passed: true,
    },
  },
]

describe('full Explorer lifecycle', () => {
  it('register user → stored in known_users', () => {
    db.prepare('INSERT OR IGNORE INTO known_users (user_id, first_seen) VALUES (?, ?)').run(
      USER_ID,
      new Date().toISOString()
    )
    const row = db.prepare('SELECT user_id FROM known_users WHERE user_id = ?').get(USER_ID) as
      | { user_id: string }
      | undefined
    expect(row?.user_id).toBe(USER_ID)
  })

  it('metrics aggregation from ADP data', () => {
    const metrics = computeMetrics('7d', SESSIONS, MESSAGES)
    expect(metrics.total_sessions).toBe(2)
    expect(metrics.total_messages).toBe(6)
    // assistant scored turns: 0.92, 0.55, 0.88
    const expectedAvg = (0.92 + 0.55 + 0.88) / 3
    expect(metrics.avg_confidence_score).toBeCloseTo(expectedAvg, 5)
    // guardrail: 3 turns with boolean, 1 failed → 1/3
    expect(metrics.guardrail_failure_rate).toBeCloseTo(1 / 3, 5)
    expect(metrics.sessions_per_day.length).toBeGreaterThanOrEqual(1)
  })

  it('session list is reverse-chronological and paginated', () => {
    const msgsBySession = new Map<string, AdpMessage[]>()
    for (const m of MESSAGES) {
      const arr = msgsBySession.get(m.session_id) ?? []
      arr.push(m)
      msgsBySession.set(m.session_id, arr)
    }
    const { items, next_cursor } = buildSessionSummaries(SESSIONS, msgsBySession, null, 10)
    expect(items[0].session_id).toBe('sess-001')
    expect(items[1].session_id).toBe('sess-002')
    expect(next_cursor).toBeNull()
    expect(items[0].first_user_message).toBe('What is your return policy?')
    expect(items[0].message_count).toBe(4)
  })

  it('conversation trace returns chronological messages with metadata', () => {
    const sess1Messages = MESSAGES.filter(m => m.session_id === 'sess-001')
    const trace = buildTrace(sess1Messages)
    expect(trace).toHaveLength(4)
    expect(trace[0].role).toBe('user')
    expect(trace[1].role).toBe('assistant')
    expect(trace[1].metadata.confidence_score).toBe(0.92)
    expect(trace[1].metadata.guardrail_passed).toBe(true)
    expect(trace[1].metadata.citations).toContain('https://example.com/returns')
    expect(trace[3].metadata.guardrail_passed).toBe(false)
  })

  it('search returns merged results across users', () => {
    const searchResults: AdpSearchResult[] = [
      {
        message_id: 'msg-001',
        session_id: 'sess-001',
        role: 'user',
        content: 'What is your return policy?',
        created_at: daysAgo(1),
      },
      {
        message_id: 'msg-003',
        session_id: 'sess-001',
        role: 'user',
        content: 'What is your return policy?',
        created_at: daysAgo(1),
      },
    ]
    const { items } = mergeSearchResults(searchResults, null, 10)
    expect(items).toHaveLength(2)
    expect(items[0].session_id).toBe('sess-001')
  })

  it('top questions groups and ranks user messages', () => {
    const questions = computeTopQuestions(MESSAGES, 10)
    expect(questions[0].question).toContain('what is your return policy')
    expect(questions[0].count).toBe(2)
    expect(questions[1].count).toBe(1)
    expect(questions[0].example_session_id).toBe('sess-001')
  })
})
