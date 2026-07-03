import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { createArticle, listArticles, setArticleStatus } from '../../../../lib/articles'
import { ingestArticle } from '../../../../lib/ingestion'

export async function POST(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const body = await req.json()
  if (!body.title || !body.content) return apiError('validation_error', 'title and content are required', 422)
  const db = getDb()
  const article = createArticle(db, body)
  const result = await ingestArticle(article.article_id, article.content)
  const final = setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null)
  return NextResponse.json(final, { status: 201 })
}

export function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const db = getDb()
  return NextResponse.json(listArticles(db, status, cursor, limit))
}
