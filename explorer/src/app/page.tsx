import { MetricCard } from '../../components/MetricCard'
import { SparklineChart } from '../../components/SparklineChart'

interface MetricsResponse {
  window: string
  total_sessions: number
  total_messages: number
  avg_confidence_score: number | null
  guardrail_failure_rate: number | null
  sessions_per_day: { date: string; count: number }[]
}

async function fetchMetrics(window: string): Promise<MetricsResponse | null> {
  try {
    const res = await fetch(
      `http://localhost:8400/api/metrics?window=${window}`,
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { window?: string }
}) {
  const window = searchParams.window ?? '7d'
  const metrics = await fetchMetrics(window)

  const windows = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          {windows.map(w => (
            <a
              key={w.value}
              href={`/?window=${w.value}`}
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

      {!metrics ? (
        <p className="text-muted text-sm">Unable to load metrics. Make sure Explorer API is running and configured.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
            <MetricCard
              label="Total sessions"
              value={metrics.total_sessions.toLocaleString()}
            />
            <MetricCard
              label="Total messages"
              value={metrics.total_messages.toLocaleString()}
            />
            <MetricCard
              label="Avg confidence"
              value={
                metrics.avg_confidence_score !== null
                  ? `${(metrics.avg_confidence_score * 100).toFixed(1)}%`
                  : '—'
              }
            />
            <MetricCard
              label="Guardrail failure rate"
              value={
                metrics.guardrail_failure_rate !== null
                  ? `${(metrics.guardrail_failure_rate * 100).toFixed(1)}%`
                  : '—'
              }
            />
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">
              Sessions per day
            </h2>
            <SparklineChart data={metrics.sessions_per_day} />
          </div>
        </>
      )}
    </div>
  )
}
