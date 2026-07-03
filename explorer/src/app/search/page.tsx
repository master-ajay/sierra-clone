import Link from 'next/link'

interface SearchResult {
  message_id: string
  session_id: string
  role: string
  content: string
  created_at: string
}

interface SearchResponse {
  items: SearchResult[]
  next_cursor: string | null
}

async function fetchSearch(q: string, window: string): Promise<SearchResponse | null> {
  if (!q.trim()) return null
  try {
    const params = new URLSearchParams({ q, window, limit: '20' })
    const res = await fetch(
      `http://localhost:8400/api/search?${params}`,
      {
        headers: { 'X-API-Key': process.env.EXPLORER_API_KEY ?? 'change-me' },
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; window?: string }
}) {
  const q = searchParams.q ?? ''
  const window = searchParams.window ?? '7d'
  const data = q ? await fetchSearch(q, window) : null

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Search conversations</h1>

      <form method="GET" className="flex gap-2 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search message content…"
          className="flex-1 bg-surface border border-border rounded-md px-4 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input type="hidden" name="window" value={window} />
        <button
          type="submit"
          className="bg-accent text-white text-sm px-4 py-2 rounded-md hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Search
        </button>
      </form>

      {q && !data && (
        <p className="text-muted text-sm">Unable to fetch results.</p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-muted text-sm">No results for &ldquo;{q}&rdquo;.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map(r => (
            <div key={r.message_id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href={`/sessions/${r.session_id}`}
                  className="text-xs text-accent hover:underline"
                >
                  Session {r.session_id.slice(0, 8)}…
                </Link>
                <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-100 line-clamp-3">{r.content}</p>
              <span className="text-xs text-muted mt-1 inline-block capitalize">{r.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
