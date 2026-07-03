import type { AdpSession, AdpMessage } from './adp'

export interface SessionSummary {
  session_id: string
  started_at: string
  message_count: number
  first_user_message: string
  last_activity: string
}

export interface MessageTrace {
  message_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata: {
    citations?: string[]
    confidence_score?: number
    guardrail_passed?: boolean
    action?: string
  }
}

export function buildSessionSummaries(
  sessions: AdpSession[],
  messagesBySession: Map<string, AdpMessage[]>,
  cursor: string | null,
  limit: number
): { items: SessionSummary[]; next_cursor: string | null } {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )

  let startIdx = 0
  if (cursor) {
    const idx = sorted.findIndex(s => s.session_id === cursor)
    if (idx !== -1) startIdx = idx + 1
  }

  const page = sorted.slice(startIdx, startIdx + limit)
  const next_cursor =
    startIdx + limit < sorted.length ? sorted[startIdx + limit - 1].session_id : null

  const items: SessionSummary[] = page.map(s => {
    const msgs = messagesBySession.get(s.session_id) ?? []
    const firstUser = msgs.find(m => m.role === 'user')
    return {
      session_id: s.session_id,
      started_at: s.started_at,
      message_count: msgs.length,
      first_user_message: firstUser ? firstUser.content.slice(0, 120) : '',
      last_activity: s.last_activity,
    }
  })

  return { items, next_cursor }
}

export function buildTrace(messages: AdpMessage[]): MessageTrace[] {
  return messages
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(m => ({
      message_id: m.message_id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
      metadata: m.metadata ?? {},
    }))
}
