import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../../../lib/auth'
import { getDb } from '../../../../../../lib/db'
import { upsertBySourceId, setArticleStatus } from '../../../../../../lib/articles'
import { ingestArticle } from '../../../../../../lib/ingestion'

export async function PUT(req: NextRequest, { params }: { params: { source_id: string } }) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const body = await req.json()
  if (!body.title || !body.content) return apiError('validation_error', 'title and content are required', 422)
  const db = getDb()
  const article = upsertBySourceId(db, params.source_id, body)
  const result = await ingestArticle(article.article_id, article.content)
  return NextResponse.json(setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null))
}
