import { describe, it, expect, beforeEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createTestDb } from '../lib/db'
import {
  createArticle, getArticle, getArticleBySourceId, listArticles,
  updateArticle, deleteArticle, upsertBySourceId, setArticleStatus, searchArticles
} from '../lib/articles'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb(join(tmpdir(), `gw-test-${randomUUID()}.db`))
})

describe('createArticle', () => {
  it('creates with pending status', () => {
    const a = createArticle(db, { title: 'Hello', content: 'Some content here' })
    expect(a.status).toBe('pending')
    expect(a.title).toBe('Hello')
    expect(a.word_count).toBe(3)
    expect(a.source_id).toBeNull()
  })

  it('stores source_id when provided', () => {
    const a = createArticle(db, { title: 'T', content: 'c', source_id: 'ext-1' })
    expect(a.source_id).toBe('ext-1')
  })
})

describe('getArticle', () => {
  it('returns null for missing', () => {
    expect(getArticle(db, 'ghost')).toBeNull()
  })
})

describe('listArticles', () => {
  it('returns all articles newest first', () => {
    createArticle(db, { title: 'A', content: 'a' })
    createArticle(db, { title: 'B', content: 'b' })
    const { items } = listArticles(db, null, null, 20)
    expect(items.length).toBe(2)
  })

  it('filters by status', () => {
    const a = createArticle(db, { title: 'A', content: 'a' })
    setArticleStatus(db, a.article_id, 'indexed')
    createArticle(db, { title: 'B', content: 'b' })
    const { items } = listArticles(db, 'indexed', null, 20)
    expect(items.length).toBe(1)
    expect(items[0].status).toBe('indexed')
  })

  it('paginates', () => {
    for (let i = 0; i < 5; i++) createArticle(db, { title: `T${i}`, content: `c${i}` })
    const { items, next_cursor } = listArticles(db, null, null, 3)
    expect(items.length).toBe(3)
    expect(next_cursor).not.toBeNull()
  })
})

describe('updateArticle', () => {
  it('resets status to pending', () => {
    const a = createArticle(db, { title: 'T', content: 'c' })
    setArticleStatus(db, a.article_id, 'indexed')
    const updated = updateArticle(db, a.article_id, { content: 'new content' })
    expect(updated?.status).toBe('pending')
    expect(updated?.content).toBe('new content')
  })

  it('returns null for missing', () => {
    expect(updateArticle(db, 'ghost', { title: 'x' })).toBeNull()
  })
})

describe('deleteArticle', () => {
  it('removes the article', () => {
    const a = createArticle(db, { title: 'T', content: 'c' })
    expect(deleteArticle(db, a.article_id)).toBe(true)
    expect(getArticle(db, a.article_id)).toBeNull()
  })

  it('returns false for missing', () => {
    expect(deleteArticle(db, 'ghost')).toBe(false)
  })
})

describe('upsertBySourceId', () => {
  it('creates if not exists', () => {
    const a = upsertBySourceId(db, 'src-1', { title: 'T', content: 'c' })
    expect(a.source_id).toBe('src-1')
  })

  it('updates if exists', () => {
    upsertBySourceId(db, 'src-1', { title: 'T', content: 'old' })
    const updated = upsertBySourceId(db, 'src-1', { title: 'T2', content: 'new' })
    expect(updated.title).toBe('T2')
    expect(updated.content).toBe('new')
    expect(listArticles(db, null, null, 20).items.length).toBe(1)
  })
})

describe('searchArticles', () => {
  it('finds by keyword in content', () => {
    createArticle(db, { title: 'Policy', content: 'Our return policy is 30 days' })
    createArticle(db, { title: 'Shipping', content: 'We ship fast' })
    const { items } = searchArticles(db, 'return', null, 20)
    expect(items.length).toBe(1)
    expect(items[0].title).toBe('Policy')
  })

  it('is case insensitive', () => {
    createArticle(db, { title: 'T', content: 'Shipping policy' })
    expect(searchArticles(db, 'SHIPPING', null, 20).items.length).toBe(1)
  })

  it('finds by title', () => {
    createArticle(db, { title: 'Returns Guide', content: 'details here' })
    expect(searchArticles(db, 'returns', null, 20).items.length).toBe(1)
  })

  it('returns empty for no match', () => {
    createArticle(db, { title: 'T', content: 'c' })
    expect(searchArticles(db, 'pizza', null, 20).items).toEqual([])
  })
})
