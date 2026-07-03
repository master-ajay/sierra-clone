import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createTestDb } from '../lib/db'
import {
  createArticle, getArticle, listArticles, updateArticle,
  deleteArticle, upsertBySourceId, setArticleStatus, searchArticles
} from '../lib/articles'
import { ingestArticle } from '../lib/ingestion'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb(join(tmpdir(), `gw-int-${randomUUID()}.db`))
  vi.resetAllMocks()
})

describe('full article lifecycle', () => {
  it('create → index → update → re-index → search → delete', async () => {
    // 1. Create
    const article = createArticle(db, { title: 'Shipping Policy', content: 'We ship within 2 business days.' })
    expect(article.status).toBe('pending')

    // 2. Simulate successful ingestion
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    let result = await ingestArticle(article.article_id, article.content)
    setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null)
    expect(getArticle(db, article.article_id)?.status).toBe('indexed')

    // 3. Update → status resets to pending
    const updated = updateArticle(db, article.article_id, { content: 'We ship within 1 business day.' })
    expect(updated?.status).toBe('pending')

    // 4. Re-index
    result = await ingestArticle(article.article_id, updated!.content)
    setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null)
    expect(getArticle(db, article.article_id)?.status).toBe('indexed')

    // 5. Search finds it
    const { items } = searchArticles(db, 'shipping', null, 20)
    expect(items.length).toBe(1)

    // 6. Delete
    deleteArticle(db, article.article_id)
    expect(getArticle(db, article.article_id)).toBeNull()

    // 7. Search returns empty
    expect(searchArticles(db, 'shipping', null, 20).items).toEqual([])
  })

  it('failed ingestion sets error status, article is not lost', async () => {
    const article = createArticle(db, { title: 'T', content: 'c' })
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'Service unavailable' })
    const result = await ingestArticle(article.article_id, article.content)
    setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null)
    const saved = getArticle(db, article.article_id)
    expect(saved).not.toBeNull()
    expect(saved?.status).toBe('error')
    expect(saved?.error_detail).toContain('503')
  })

  it('upsert is idempotent', () => {
    upsertBySourceId(db, 'src-1', { title: 'T', content: 'v1' })
    upsertBySourceId(db, 'src-1', { title: 'T', content: 'v2' })
    const { items } = listArticles(db, null, null, 20)
    expect(items.length).toBe(1)
    expect(items[0].content).toBe('v2')
  })
})
