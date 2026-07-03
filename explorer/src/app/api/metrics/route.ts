import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { fetchUserSessions, fetchSessionMessages } from '../../../../lib/adp'
import { computeMetrics } from '../../../../lib/metrics'
import type { AdpSession, AdpMessage } from '../../../../lib/adp'

const VALID_WINDOWS = new Set(['today', '7d', '30d'])

export async function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const window = searchParams.get('window') ?? '7d'

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

  const allMessages: AdpMessage[] = []
  for (const session of allSessions) {
    const msgs = await fetchSessionMessages(session.session_id)
    allMessages.push(...msgs)
  }

  const metrics = computeMetrics(window, allSessions, allMessages)
  return NextResponse.json(metrics)
}
