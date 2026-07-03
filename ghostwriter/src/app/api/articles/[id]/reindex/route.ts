import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../../../lib/auth'
import { getDb } from '../../../../../../lib/db'
import { getArticle, setArticleStatus } from '../../../../../../lib/articles'
import { ingestArticle } from '../../../../../../lib/ingestion'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const db = getDb()
  const article = getArticle(db, params.id)
  if (!article) return apiError('not_found', 'article not found', 404)
  const result = await ingestArticle(article.article_id, article.content)
  return NextResponse.json(setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null))
}
