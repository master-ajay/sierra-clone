import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { searchUserMessages } from '../../../../lib/adp'
import { mergeSearchResults } from '../../../../lib/search'
import type { AdpSearchResult } from '../../../../lib/adp'

const VALID_WINDOWS = new Set(['today', '7d', '30d'])

export async function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const window = searchParams.get('window') ?? '7d'
  const cursor = searchParams.get('cursor') ?? null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  if (!q.trim()) {
    return apiError('bad_request', 'q parameter is required', 400)
  }

  if (!VALID_WINDOWS.has(window)) {
    return apiError('bad_request', 'Invalid window. Use: today, 7d, 30d', 400)
  }

  const db = getDb()
  const users = db.prepare('SELECT user_id FROM known_users').all() as { user_id: string }[]

  const allResults: AdpSearchResult[] = []
  for (const { user_id } of users) {
    const results = await searchUserMessages(user_id, q, window)
    allResults.push(...results)
  }

  const result = mergeSearchResults(allResults, cursor, limit)
  return NextResponse.json(result)
}
