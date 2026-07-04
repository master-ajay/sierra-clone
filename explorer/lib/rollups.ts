import type Database from 'better-sqlite3'
import type { AdpSession, AdpMessage } from './adp'
import type { Channel } from './channels'

export interface RollupRow {
  rollup_date: string
  agent_id: string
  channel_id: string
  session_count: number
  message_count: number
  avg_confidence_score: number | null
  guardrail_pass_rate: number | null
}

function dateKeyUtc(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Computes one rollup row per channel for a given date, from that channel's
 * ADP sessions/messages. Pure function — no DB or network access — so it's
 * testable the same way lib/metrics.ts's computeMetrics is.
 */
export function computeRollup(
  date: string,
  channel: Channel,
  sessions: AdpSession[],
  messages: AdpMessage[]
): RollupRow {
  const daySessions = sessions.filter((s) => dateKeyUtc(s.started_at) === date)
  const sessionIds = new Set(daySessions.map((s) => s.session_id))
  const dayMessages = messages.filter((m) => sessionIds.has(m.session_id))
  const assistantTurns = dayMessages.filter((m) => m.role === 'assistant')

  const scored = assistantTurns.filter((m) => typeof m.metadata?.confidence_score === 'number')
  const avg_confidence_score =
    scored.length > 0
      ? scored.reduce((sum, m) => sum + (m.metadata.confidence_score ?? 0), 0) / scored.length
      : null

  const guarded = assistantTurns.filter((m) => typeof m.metadata?.guardrail_passed === 'boolean')
  const guardrail_pass_rate =
    guarded.length > 0
      ? guarded.filter((m) => m.metadata.guardrail_passed === true).length / guarded.length
      : null

  return {
    rollup_date: date,
    agent_id: channel.agent_id,
    channel_id: channel.channel_id,
    session_count: daySessions.length,
    message_count: dayMessages.length,
    avg_confidence_score,
    guardrail_pass_rate,
  }
}

export function upsertRollup(db: Database.Database, row: RollupRow): void {
  db.prepare(
    `INSERT INTO daily_rollups
       (rollup_date, agent_id, channel_id, session_count, message_count, avg_confidence_score, guardrail_pass_rate, computed_at)
     VALUES (@rollup_date, @agent_id, @channel_id, @session_count, @message_count, @avg_confidence_score, @guardrail_pass_rate, @computed_at)
     ON CONFLICT(rollup_date, agent_id, channel_id) DO UPDATE SET
       session_count = excluded.session_count,
       message_count = excluded.message_count,
       avg_confidence_score = excluded.avg_confidence_score,
       guardrail_pass_rate = excluded.guardrail_pass_rate,
       computed_at = excluded.computed_at`
  ).run({ ...row, computed_at: new Date().toISOString() })
}

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendResponse {
  window: 'day' | 'week' | 'month'
  current: TrendPoint[]
  previous: TrendPoint[]
  percent_change: number | null
}

const WINDOW_DAYS: Record<TrendResponse['window'], number> = { day: 1, week: 7, month: 30 }

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function getVolumeTrend(db: Database.Database, window: TrendResponse['window']): TrendResponse {
  const span = WINDOW_DAYS[window]
  const currentStart = isoDaysAgo(span - 1)
  const previousStart = isoDaysAgo(span * 2 - 1)
  const previousEnd = isoDaysAgo(span)

  const currentRows = db
    .prepare(
      `SELECT rollup_date, SUM(session_count) AS total FROM daily_rollups
       WHERE rollup_date >= ? GROUP BY rollup_date ORDER BY rollup_date`
    )
    .all(currentStart) as { rollup_date: string; total: number }[]

  const previousRows = db
    .prepare(
      `SELECT rollup_date, SUM(session_count) AS total FROM daily_rollups
       WHERE rollup_date >= ? AND rollup_date <= ? GROUP BY rollup_date ORDER BY rollup_date`
    )
    .all(previousStart, previousEnd) as { rollup_date: string; total: number }[]

  const current = currentRows.map((r) => ({ date: r.rollup_date, value: r.total }))
  const previous = previousRows.map((r) => ({ date: r.rollup_date, value: r.total }))

  const currentTotal = current.reduce((sum, p) => sum + p.value, 0)
  const previousTotal = previous.reduce((sum, p) => sum + p.value, 0)
  const percent_change = previousTotal > 0 ? (currentTotal - previousTotal) / previousTotal : null

  return { window, current, previous, percent_change }
}

export interface AgentBreakdownRow {
  agent_id: string
  session_count: number
  message_count: number
  avg_confidence_score: number | null
}

export function getAgentBreakdown(db: Database.Database, window: TrendResponse['window']): AgentBreakdownRow[] {
  const span = WINDOW_DAYS[window]
  const start = isoDaysAgo(span - 1)
  const rows = db
    .prepare(
      `SELECT agent_id,
              SUM(session_count) AS session_count,
              SUM(message_count) AS message_count,
              AVG(avg_confidence_score) AS avg_confidence_score
       FROM daily_rollups
       WHERE rollup_date >= ?
       GROUP BY agent_id
       ORDER BY session_count DESC`
    )
    .all(start) as AgentBreakdownRow[]
  return rows
}

export interface ChannelBreakdownRow {
  channel_id: string
  session_count: number
  message_count: number
  avg_confidence_score: number | null
}

export function getChannelBreakdown(db: Database.Database, window: TrendResponse['window']): ChannelBreakdownRow[] {
  const span = WINDOW_DAYS[window]
  const start = isoDaysAgo(span - 1)
  const rows = db
    .prepare(
      `SELECT channel_id,
              SUM(session_count) AS session_count,
              SUM(message_count) AS message_count,
              AVG(avg_confidence_score) AS avg_confidence_score
       FROM daily_rollups
       WHERE rollup_date >= ?
       GROUP BY channel_id
       ORDER BY session_count DESC`
    )
    .all(start) as ChannelBreakdownRow[]
  return rows
}
