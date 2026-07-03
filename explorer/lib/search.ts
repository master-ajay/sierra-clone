import type { AdpSearchResult } from './adp'

export interface SearchResult {
  message_id: string
  session_id: string
  role: string
  content: string
  created_at: string
}

export function mergeSearchResults(
  results: AdpSearchResult[],
  cursor: string | null,
  limit: number
): { items: SearchResult[]; next_cursor: string | null } {
  const sorted = [...results].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  let startIdx = 0
  if (cursor) {
    const idx = sorted.findIndex(r => r.message_id === cursor)
    if (idx !== -1) startIdx = idx + 1
  }

  const page = sorted.slice(startIdx, startIdx + limit)
  const next_cursor =
    startIdx + limit < sorted.length ? sorted[startIdx + limit - 1].message_id : null

  return {
    items: page.map(r => ({
      message_id: r.message_id,
      session_id: r.session_id,
      role: r.role,
      content: r.content,
      created_at: r.created_at,
    })),
    next_cursor,
  }
}
