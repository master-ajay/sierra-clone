import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../../lib/auth'
import { getDb } from '../../../../../lib/db'
import { getArticle, updateArticle, deleteArticle, setArticleStatus } from '../../../../../lib/articles'
import { ingestArticle, removeArticle } from '../../../../../lib/ingestion'

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const db = getDb()
  const article = getArticle(db, params.id)
  if (!article) return apiError('not_found', 'article not found', 404)
  return NextResponse.json(article)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const db = getDb()
  const body = await req.json()
  const article = updateArticle(db, params.id, body)
  if (!article) return apiError('not_found', 'article not found', 404)
  const result = await ingestArticle(article.article_id, article.content)
  return NextResponse.json(setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null))
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const db = getDb()
  const article = getArticle(db, params.id)
  if (!article) return apiError('not_found', 'article not found', 404)
  deleteArticle(db, params.id)
  await removeArticle(params.id)
  return new NextResponse(null, { status: 204 })
}
