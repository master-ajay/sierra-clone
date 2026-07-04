import { AppShell, Table, EmptyState } from 'design-system'
import { explorerNav } from '../nav'

interface SessionSummary {
  session_id: string
  started_at: string
  message_count: number
  first_user_message: string
  last_activity: string
}

interface SessionsResponse {
  items: SessionSummary[]
  next_cursor: string | null
}

async function fetchSessions(window: string, cursor?: string): Promise<SessionsResponse | null> {
  try {
    const params = new URLSearchParams({ window, limit: '20' })
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`http://localhost:8400/api/sessions?${params}`, {
      headers: { 'X-API-Key': process.env.EXPLORER_API_KEY ?? 'change-me' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const WINDOWS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

const COLUMNS = [
  {
    key: 'first_user_message',
    header: 'First message',
    render: (s: SessionSummary) => (
      <a href={`/sessions/${s.session_id}`} className="hover:text-brand-primary">
        {s.first_user_message || <span className="italic text-text-muted">No user message</span>}
      </a>
    ),
  },
  {
    key: 'started_at',
    header: 'Started',
    render: (s: SessionSummary) => new Date(s.started_at).toLocaleDateString(),
  },
  { key: 'message_count', header: 'Msgs' },
]

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { window?: string; cursor?: string }
}) {
  const window = searchParams.window ?? '7d'
  const data = await fetchSessions(window, searchParams.cursor)

  return (
    <AppShell
      nav={explorerNav('sessions')}
      productName="Insights / Explorer"
      title="Sessions"
      actions={
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <a
              key={w.value}
              href={`/sessions?window=${w.value}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                window === w.value
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {w.label}
            </a>
          ))}
        </div>
      }
    >
      {!data ? (
        <p className="text-sm text-text-muted">Unable to load sessions.</p>
      ) : data.items.length === 0 ? (
        <EmptyState heading="No sessions" body="No conversations happened in this period." />
      ) : (
        <>
          <Table columns={COLUMNS} data={data.items} rowKey="session_id" />
          <div className="mt-4 flex justify-end">
            {data.next_cursor && (
              <a
                href={`/sessions?window=${window}&cursor=${data.next_cursor}`}
                className="text-sm text-brand-primary hover:underline"
              >
                Next page →
              </a>
            )}
          </div>
        </>
      )}
    </AppShell>
  )
}
