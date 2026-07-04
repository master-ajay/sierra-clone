import { AppShell, Card, Table } from 'design-system'
import { explorerNav } from '../nav'

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
    const res = await fetch(`http://localhost:8400/api/search?${params}`, {
      headers: { 'X-API-Key': process.env.EXPLORER_API_KEY ?? 'change-me' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const COLUMNS = [
  {
    key: 'session_id',
    header: 'Session',
    render: (r: SearchResult) => (
      <a href={`/sessions/${r.session_id}`} className="text-brand-primary hover:underline">
        {r.session_id.slice(0, 8)}…
      </a>
    ),
  },
  {
    key: 'content',
    header: 'Content',
    render: (r: SearchResult) => <span className="line-clamp-2">{r.content}</span>,
  },
  { key: 'role', header: 'Role' },
  {
    key: 'created_at',
    header: 'Date',
    render: (r: SearchResult) => new Date(r.created_at).toLocaleDateString(),
  },
]

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; window?: string }
}) {
  const q = searchParams.q ?? ''
  const window = searchParams.window ?? '7d'
  const data = q ? await fetchSearch(q, window) : null

  return (
    <AppShell nav={explorerNav('search')} productName="Insights / Explorer" title="Search conversations">
      <Card className="mb-6">
        <form method="GET" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search message content…"
            className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          />
          <input type="hidden" name="window" value={window} />
          <button
            type="submit"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            Search
          </button>
        </form>
      </Card>

      {q && !data && <p className="text-sm text-text-muted">Unable to fetch results.</p>}
      {data && data.items.length === 0 && (
        <p className="text-sm text-text-muted">No results for &ldquo;{q}&rdquo;.</p>
      )}
      {data && data.items.length > 0 && (
        <Table columns={COLUMNS} data={data.items} rowKey="message_id" />
      )}
    </AppShell>
  )
}
