import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { fetchUserSessions, fetchSessionMessages } from '../../../../lib/adp'
import { buildSessionSummaries } from '../../../../lib/sessions'
import type { AdpSession, AdpMessage } from '../../../../lib/adp'

const VALID_WINDOWS = new Set(['today', '7d', '30d'])

export async function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const window = searchParams.get('window') ?? '7d'
  const cursor = searchParams.get('cursor') ?? null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  if (!VALID_WINDOWS.has(window)) {
    return apiError('bad_request', 'Invalid window. Use: today, 7d, 30d', 400)
  }

  const db = getDb()
  const users = db.prepare('SELECT user_id FROM known_users').all() as { user_id: string }[]

  const allSessions: AdpSession[] = []
  for (const { user_id } of users) {
    const sessions = await fetchUserSessions(user_id, window)
    allSessions.push(...sessions)
  }

  const messagesBySession = new Map<string, AdpMessage[]>()
  for (const session of allSessions) {
    const msgs = await fetchSessionMessages(session.session_id)
    messagesBySession.set(session.session_id, msgs)
  }

  const result = buildSessionSummaries(allSessions, messagesBySession, cursor, limit)
  return NextResponse.json(result)
}
