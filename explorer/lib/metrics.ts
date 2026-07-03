import type { AdpSession, AdpMessage } from './adp'

export interface MetricsResponse {
  window: string
  total_sessions: number
  total_messages: number
  avg_confidence_score: number | null
  guardrail_failure_rate: number | null
  sessions_per_day: { date: string; count: number }[]
}

function windowStartUtc(window: string): Date {
  const now = new Date()
  if (window === 'today') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  }
  if (window === '30d') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29))
  }
  // default: 7d
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6))
}

export function computeMetrics(
  window: string,
  sessions: AdpSession[],
  allMessages: AdpMessage[]
): MetricsResponse {
  const start = windowStartUtc(window)

  const filtered = sessions.filter(s => new Date(s.started_at) >= start)

  const sessionIds = new Set(filtered.map(s => s.session_id))
  const messages = allMessages.filter(m => sessionIds.has(m.session_id))

  const assistantTurns = messages.filter(m => m.role === 'assistant')

  const scoredTurns = assistantTurns.filter(
    m => typeof m.metadata?.confidence_score === 'number'
  )

  const avg_confidence_score =
    scoredTurns.length > 0
      ? scoredTurns.reduce((sum, m) => sum + (m.metadata.confidence_score ?? 0), 0) /
        scoredTurns.length
      : null

  const guardrailTurns = assistantTurns.filter(
    m => typeof m.metadata?.guardrail_passed === 'boolean'
  )

  const guardrail_failure_rate =
    guardrailTurns.length > 0
      ? guardrailTurns.filter(m => m.metadata.guardrail_passed === false).length /
        guardrailTurns.length
      : null

  const dayCounts: Record<string, number> = {}
  for (const s of filtered) {
    const d = new Date(s.started_at)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    dayCounts[key] = (dayCounts[key] ?? 0) + 1
  }

  const sessions_per_day = Object.entries(dayCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    window,
    total_sessions: filtered.length,
    total_messages: messages.length,
    avg_confidence_score,
    guardrail_failure_rate,
    sessions_per_day,
  }
}
