import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type Database from 'better-sqlite3'
import { createTestDb } from '../lib/db'
import { upsertRollup, getVolumeTrend, getAgentBreakdown, getChannelBreakdown, type RollupRow } from '../lib/rollups'

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function row(overrides: Partial<RollupRow>): RollupRow {
  return {
    rollup_date: isoDaysAgo(0),
    agent_id: 'agent-1',
    channel_id: 'chan-1',
    session_count: 1,
    message_count: 2,
    avg_confidence_score: 0.8,
    guardrail_pass_rate: 1,
    ...overrides,
  }
}

describe('rollups (db-backed)', () => {
  let db: Database.Database
  let dbPath: string

  beforeEach(() => {
    dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'explorer-test-')), 'test.db')
    db = createTestDb(dbPath)
  })

  it('upsertRollup overwrites rather than duplicates on the same key', () => {
    upsertRollup(db, row({ session_count: 3 }))
    upsertRollup(db, row({ session_count: 7 }))
    const count = db.prepare('SELECT COUNT(*) AS c FROM daily_rollups').get() as { c: number }
    expect(count.c).toBe(1)
    const saved = db.prepare('SELECT session_count FROM daily_rollups').get() as { session_count: number }
    expect(saved.session_count).toBe(7)
  })

  it('getVolumeTrend computes percent_change from current vs previous week', () => {
    upsertRollup(db, row({ rollup_date: isoDaysAgo(0), session_count: 10 }))
    upsertRollup(db, row({ rollup_date: isoDaysAgo(8), session_count: 5, channel_id: 'chan-2' }))

    const trend = getVolumeTrend(db, 'week')
    expect(trend.current.reduce((s, p) => s + p.value, 0)).toBe(10)
    expect(trend.previous.reduce((s, p) => s + p.value, 0)).toBe(5)
    expect(trend.percent_change).toBeCloseTo(1) // 100% increase
  })

  it('getVolumeTrend returns null percent_change when there is no prior data', () => {
    upsertRollup(db, row({ rollup_date: isoDaysAgo(0), session_count: 10 }))
    const trend = getVolumeTrend(db, 'week')
    expect(trend.percent_change).toBeNull()
  })

  it('getAgentBreakdown sorts by session_count descending', () => {
    upsertRollup(db, row({ agent_id: 'agent-a', session_count: 2 }))
    upsertRollup(db, row({ agent_id: 'agent-b', channel_id: 'chan-2', session_count: 9 }))

    const breakdown = getAgentBreakdown(db, 'week')
    expect(breakdown[0].agent_id).toBe('agent-b')
    expect(breakdown[1].agent_id).toBe('agent-a')
  })

  it('getChannelBreakdown sorts by session_count descending', () => {
    upsertRollup(db, row({ channel_id: 'chan-a', session_count: 1 }))
    upsertRollup(db, row({ channel_id: 'chan-b', agent_id: 'agent-2', session_count: 4 }))

    const breakdown = getChannelBreakdown(db, 'week')
    expect(breakdown[0].channel_id).toBe('chan-b')
    expect(breakdown[1].channel_id).toBe('chan-a')
  })
})
