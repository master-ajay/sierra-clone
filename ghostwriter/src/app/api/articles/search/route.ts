import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../../lib/auth'
import { getDb } from '../../../../../lib/db'
import { searchArticles } from '../../../../../lib/articles'

export function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q) return apiError('validation_error', 'q is required', 422)
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const db = getDb()
  return NextResponse.json(searchArticles(db, q, cursor, limit))
}
