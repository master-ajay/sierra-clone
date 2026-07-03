import Link from 'next/link'
import { SessionTable } from '../../../components/SessionTable'

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
    const res = await fetch(
      `http://localhost:8400/api/sessions?${params}`,
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

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { window?: string; cursor?: string }
}) {
  const window = searchParams.window ?? '7d'
  const data = await fetchSessions(window, searchParams.cursor)

  const windows = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Sessions</h1>
        <div className="flex gap-2">
          {windows.map(w => (
            <a
              key={w.value}
              href={`/sessions?window=${w.value}`}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                window === w.value
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-muted hover:text-white hover:border-white/20'
              }`}
            >
              {w.label}
            </a>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="text-muted text-sm">Unable to load sessions.</p>
      ) : (
        <>
          <SessionTable sessions={data.items} />
          <div className="mt-4 flex justify-end">
            {data.next_cursor && (
              <Link
                href={`/sessions?window=${window}&cursor=${data.next_cursor}`}
                className="text-sm text-accent hover:underline"
              >
                Next page →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
