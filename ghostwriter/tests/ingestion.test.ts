import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ingestArticle, removeArticle } from '../lib/ingestion'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('ingestArticle', () => {
  it('returns success on 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    const result = await ingestArticle('art-1', 'Some content')
    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/ingest'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns failure with error message on non-200', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal error' })
    const result = await ingestArticle('art-1', 'content')
    expect(result.success).toBe(false)
    expect(result.error).toContain('500')
  })

  it('returns failure on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await ingestArticle('art-1', 'content')
    expect(result.success).toBe(false)
    expect(result.error).toContain('ECONNREFUSED')
  })
})

describe('removeArticle', () => {
  it('logs a warning and does not throw', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(removeArticle('art-1')).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('art-1'))
  })
})
