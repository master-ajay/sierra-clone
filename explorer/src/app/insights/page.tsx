import { AppShell, MetricCard, Card, Table, EmptyState } from 'design-system'
import { SparklineChart } from '../../../components/SparklineChart'
import { explorerNav } from '../nav'

interface MetricsResponse {
  window: string
  total_sessions: number
  total_messages: number
  avg_confidence_score: number | null
  guardrail_failure_rate: number | null
  sessions_per_day: { date: string; count: number }[]
}

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

const SNAPSHOT_WINDOWS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

const TREND_WINDOWS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
]

function formatPercent(change: number | null): string {
  if (change === null) return '—'
  const pct = Math.round(change * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

function pillClass(active: boolean): string {
  return active
    ? 'rounded-full border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs text-white'
    : 'rounded-full border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary'
}

const BREAKDOWN_COLUMNS = (idKey: 'agent_id' | 'channel_id', idLabel: string) => [
  { key: idKey, header: idLabel },
  { key: 'session_count', header: 'Sessions' },
  { key: 'message_count', header: 'Messages' },
  {
    key: 'avg_confidence_score',
    header: 'Avg confidence',
    render: (row: BreakdownRow) =>
      row.avg_confidence_score !== null ? row.avg_confidence_score.toFixed(2) : '—',
  },
]

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: { snapshot?: string; trend?: string }
}) {
  const snapshotWindow = searchParams.snapshot ?? '7d'
  const trendWindow = searchParams.trend ?? 'week'

  const [metrics, volume, agents, channels] = await Promise.all([
    fetchJson<MetricsResponse>(`/api/metrics?window=${snapshotWindow}`),
    fetchJson<TrendResponse>(`/api/trends/volume?window=${trendWindow}`),
    fetchJson<{ items: BreakdownRow[] }>(`/api/breakdowns/agents?window=${trendWindow}`),
    fetchJson<{ items: BreakdownRow[] }>(`/api/breakdowns/channels?window=${trendWindow}`),
  ])

  const hasTrendData = (volume?.current.length ?? 0) > 0 || (volume?.previous.length ?? 0) > 0
  const currentTotal = volume?.current.reduce((s, p) => s + p.value, 0) ?? 0
  const previousTotal = volume?.previous.reduce((s, p) => s + p.value, 0) ?? 0

  return (
    <AppShell nav={explorerNav('insights')} productName="Insights / Explorer" title="Insights">
      <div className="flex flex-col gap-8">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
              Live snapshot
            </h2>
            <div className="flex gap-2">
              {SNAPSHOT_WINDOWS.map((w) => (
                <a key={w.value} href={`/insights?snapshot=${w.value}&trend=${trendWindow}`} className={pillClass(snapshotWindow === w.value)}>
                  {w.label}
                </a>
              ))}
            </div>
          </div>

          {!metrics ? (
            <p className="text-sm text-text-muted">Unable to load metrics.</p>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard label="Total sessions" value={metrics.total_sessions.toLocaleString()} />
                <MetricCard label="Total messages" value={metrics.total_messages.toLocaleString()} />
                <MetricCard
                  label="Avg confidence"
                  value={metrics.avg_confidence_score !== null ? `${(metrics.avg_confidence_score * 100).toFixed(1)}%` : '—'}
                />
                <MetricCard
                  label="Guardrail failure rate"
                  value={metrics.guardrail_failure_rate !== null ? `${(metrics.guardrail_failure_rate * 100).toFixed(1)}%` : '—'}
                />
              </div>
              <Card>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Sessions per day
                </h3>
                <SparklineChart data={metrics.sessions_per_day} />
              </Card>
            </>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
              Trend comparison
            </h2>
            <div className="flex gap-2">
              {TREND_WINDOWS.map((w) => (
                <a key={w.value} href={`/insights?snapshot=${snapshotWindow}&trend=${w.value}`} className={pillClass(trendWindow === w.value)}>
                  {w.label}
                </a>
              ))}
            </div>
          </div>

          {!hasTrendData ? (
            <EmptyState
              heading="No rollups yet"
              body="Trend history builds up once a rollup has run for at least one day. Run POST /api/rollups/run (optionally with a date body field) to compute the first snapshot."
            />
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Sessions this period"
                  value={currentTotal}
                  trend={
                    volume?.percent_change != null
                      ? { direction: volume.percent_change >= 0 ? 'up' : 'down', value: formatPercent(volume.percent_change) }
                      : undefined
                  }
                />
                <MetricCard label="Sessions previous period" value={previousTotal} />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">By agent</h3>
                  <Table
                    columns={BREAKDOWN_COLUMNS('agent_id', 'Agent')}
                    data={agents?.items ?? []}
                    rowKey="agent_id"
                    emptyMessage="No activity in this window."
                  />
                </Card>
                <Card>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">By channel</h3>
                  <Table
                    columns={BREAKDOWN_COLUMNS('channel_id', 'Channel')}
                    data={channels?.items ?? []}
                    rowKey="channel_id"
                    emptyMessage="No activity in this window."
                  />
                </Card>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}
