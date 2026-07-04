import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey } from '../../../../../lib/auth'
import { getDb } from '../../../../../lib/db'
import { fetchChannels } from '../../../../../lib/channels'
import { fetchUserSessions, fetchSessionMessages } from '../../../../../lib/adp'
import type { AdpSession, AdpMessage } from '../../../../../lib/adp'
import { computeRollup, upsertRollup } from '../../../../../lib/rollups'

function yesterdayUtc(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const date: string = body.date ?? yesterdayUtc()

  const db = getDb()
  const channels = await fetchChannels()

  const rows = []
  for (const channel of channels) {
    // A channel's ADP activity is scoped to its synthetic per-channel user
    // (adp_user_id) - the same cross-reference Channels itself uses.
    const sessions: AdpSession[] = await fetchUserSessions(channel.adp_user_id)
    const allMessages: AdpMessage[] = []
    for (const session of sessions) {
      allMessages.push(...(await fetchSessionMessages(session.session_id)))
    }
    const row = computeRollup(date, channel, sessions, allMessages)
    upsertRollup(db, row)
    rows.push(row)
  }

  return NextResponse.json({ date, channels_processed: rows.length, rows })
}
