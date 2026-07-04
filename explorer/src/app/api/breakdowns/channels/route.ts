import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../../lib/auth'
import { getDb } from '../../../../../lib/db'
import { getChannelBreakdown } from '../../../../../lib/rollups'

const VALID_WINDOWS = new Set(['day', 'week', 'month'])

export async function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const window = searchParams.get('window') ?? 'week'
  if (!VALID_WINDOWS.has(window)) {
    return apiError('bad_request', 'Invalid window. Use: day, week, month', 400)
  }

  const db = getDb()
  const items = getChannelBreakdown(db, window as 'day' | 'week' | 'month')
  return NextResponse.json({ items, next_cursor: null })
}
