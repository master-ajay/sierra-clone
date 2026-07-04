import { MetricCard } from '../../../components/MetricCard'

interface TrendPoint {
  date: string
  value: number
}

interface TrendResponse {
  window: string
  current: TrendPoint[]
  previous: TrendPoint[]
  percent_change: number | null
}

interface BreakdownRow {
  agent_id?: string
  channel_id?: string
  session_count: number
  message_count: number
  avg_confidence_score: number | null
}

const API_KEY = process.env.EXPLORER_API_KEY ?? 'change-me'

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`http://localhost:8400${path}`, {
      headers: { 'X-API-Key': API_KEY },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatPercent(change: number | null): string {
  if (change === null) return '—'
  const pct = Math.round(change * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: { window?: string }
}) {
  const window = searchParams.window ?? 'week'

  const [volume, agents, channels] = await Promise.all([
    fetchJson<TrendResponse>(`/api/trends/volume?window=${window}`),
    fetchJson<{ items: BreakdownRow[] }>(`/api/breakdowns/agents?window=${window}`),
    fetchJson<{ items: BreakdownRow[] }>(`/api/breakdowns/channels?window=${window}`),
  ])

  const windows = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
  ]

  const hasData = (volume?.current.length ?? 0) > 0 || (volume?.previous.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Insights</h1>
        <div className="flex gap-2">
          {windows.map((w) => (
            <a
              key={w.value}
              href={`/insights?window=${w.value}`}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                window === w.value
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-muted hover:text-white'
              }`}
            >
              {w.label}
            </a>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted mb-4">
            No rollups yet. Trend history builds up once a rollup has run for at least
            one day.
          </p>
          <form action="/api/rollups/run" method="POST">
            <p className="text-xs text-muted">
              Run <code className="bg-base px-1 py-0.5 rounded">POST /api/rollups/run</code>{' '}
              (with an optional <code className="bg-base px-1 py-0.5 rounded">date</code>{' '}
              body field) to compute the first snapshot.
            </p>
          </form>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard
              label="Sessions this period"
              value={volume?.current.reduce((s, p) => s + p.value, 0) ?? 0}
              sub={`vs previous period: ${formatPercent(volume?.percent_change ?? null)}`}
            />
            <MetricCard
              label="Sessions previous period"
              value={volume?.previous.reduce((s, p) => s + p.value, 0) ?? 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BreakdownTable title="By agent" idLabel="Agent" rows={agents?.items ?? []} idKey="agent_id" />
            <BreakdownTable title="By channel" idLabel="Channel" rows={channels?.items ?? []} idKey="channel_id" />
          </div>
        </>
      )}
    </div>
  )
}

function BreakdownTable({
  title,
  idLabel,
  idKey,
  rows,
}: {
  title: string
  idLabel: string
  idKey: 'agent_id' | 'channel_id'
  rows: BreakdownRow[]
}) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No activity in this window.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">{idLabel}</th>
              <th className="px-4 py-2 font-medium">Sessions</th>
              <th className="px-4 py-2 font-medium">Messages</th>
              <th className="px-4 py-2 font-medium">Avg confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[idKey]} className="border-t border-border">
                <td className="px-4 py-2 text-gray-200">{row[idKey]}</td>
                <td className="px-4 py-2">{row.session_count}</td>
                <td className="px-4 py-2">{row.message_count}</td>
                <td className="px-4 py-2 text-muted">
                  {row.avg_confidence_score !== null ? row.avg_confidence_score.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
