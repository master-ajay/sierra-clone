import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../../lib/auth'
import { getDb } from '../../../../../lib/db'

export async function POST(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('bad_request', 'Invalid JSON body', 400)
  }

  const { user_id } = body as Record<string, unknown>
  if (!user_id || typeof user_id !== 'string') {
    return apiError('bad_request', 'user_id is required', 400)
  }

  const db = getDb()
  db.prepare(
    'INSERT OR IGNORE INTO known_users (user_id, first_seen) VALUES (?, ?)'
  ).run(user_id, new Date().toISOString())

  return NextResponse.json({ registered: true, user_id }, { status: 201 })
}
