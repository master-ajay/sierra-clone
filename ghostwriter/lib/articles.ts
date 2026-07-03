import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface Article {
  article_id: string
  source_id: string | null
  title: string
  content: string
  status: 'pending' | 'indexed' | 'error'
  error_detail: string | null
  word_count: number
  created_at: string
  updated_at: string
}

export interface ArticleCreate {
  title: string
  content: string
  source_id?: string
}

export interface ArticleUpdate {
  title?: string
  content?: string
}

function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

function now(): string {
  return new Date().toISOString()
}

export function createArticle(db: Database.Database, data: ArticleCreate): Article {
  const article_id = randomUUID()
  const ts = now()
  db.prepare(
    `INSERT INTO articles (article_id, source_id, title, content, status, word_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(article_id, data.source_id ?? null, data.title, data.content, wordCount(data.content), ts, ts)
  return getArticle(db, article_id)!
}

export function getArticle(db: Database.Database, article_id: string): Article | null {
  return (db.prepare('SELECT * FROM articles WHERE article_id=?').get(article_id) as Article) ?? null
}

export function getArticleBySourceId(db: Database.Database, source_id: string): Article | null {
  return (db.prepare('SELECT * FROM articles WHERE source_id=?').get(source_id) as Article) ?? null
}

export function listArticles(
  db: Database.Database,
  status: string | null,
  cursor: string | null,
  limit: number
): { items: Article[]; next_cursor: string | null } {
  let rows: Article[]
  if (status && cursor) {
    rows = db.prepare(`SELECT * FROM articles WHERE status=? AND updated_at<? ORDER BY updated_at DESC LIMIT ?`).all(status, cursor, limit + 1) as Article[]
  } else if (status) {
    rows = db.prepare(`SELECT * FROM articles WHERE status=? ORDER BY updated_at DESC LIMIT ?`).all(status, limit + 1) as Article[]
  } else if (cursor) {
    rows = db.prepare(`SELECT * FROM articles WHERE updated_at<? ORDER BY updated_at DESC LIMIT ?`).all(cursor, limit + 1) as Article[]
  } else {
    rows = db.prepare(`SELECT * FROM articles ORDER BY updated_at DESC LIMIT ?`).all(limit + 1) as Article[]
  }
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit)
  return { items, next_cursor: hasMore ? items[items.length - 1].updated_at : null }
}

export function updateArticle(db: Database.Database, article_id: string, data: ArticleUpdate): Article | null {
  const article = getArticle(db, article_id)
  if (!article) return null
  const title = data.title ?? article.title
  const content = data.content ?? article.content
  const ts = now()
  db.prepare(
    `UPDATE articles SET title=?, content=?, status='pending', error_detail=NULL, word_count=?, updated_at=? WHERE article_id=?`
  ).run(title, content, wordCount(content), ts, article_id)
  return getArticle(db, article_id)!
}

export function deleteArticle(db: Database.Database, article_id: string): boolean {
  const result = db.prepare('DELETE FROM articles WHERE article_id=?').run(article_id)
  return result.changes > 0
}

export function upsertBySourceId(db: Database.Database, source_id: string, data: ArticleCreate): Article {
  const existing = getArticleBySourceId(db, source_id)
  if (existing) {
    return updateArticle(db, existing.article_id, { title: data.title, content: data.content })!
  }
  return createArticle(db, { ...data, source_id })
}

export function setArticleStatus(
  db: Database.Database,
  article_id: string,
  status: 'indexed' | 'error',
  error_detail: string | null = null
): Article | null {
  const ts = now()
  db.prepare(`UPDATE articles SET status=?, error_detail=?, updated_at=? WHERE article_id=?`).run(status, error_detail, ts, article_id)
  return getArticle(db, article_id)
}

export function searchArticles(
  db: Database.Database,
  query: string,
  cursor: string | null,
  limit: number
): { items: Article[]; next_cursor: string | null } {
  const pattern = `%${query}%`
  let rows: Article[]
  if (cursor) {
    rows = db.prepare(
      `SELECT * FROM articles WHERE (title LIKE ? OR content LIKE ?) COLLATE NOCASE AND updated_at<? ORDER BY updated_at DESC LIMIT ?`
    ).all(pattern, pattern, cursor, limit + 1) as Article[]
  } else {
    rows = db.prepare(
      `SELECT * FROM articles WHERE (title LIKE ? OR content LIKE ?) COLLATE NOCASE ORDER BY updated_at DESC LIMIT ?`
    ).all(pattern, pattern, limit + 1) as Article[]
  }
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit)
  return { items, next_cursor: hasMore ? items[items.length - 1].updated_at : null }
}
