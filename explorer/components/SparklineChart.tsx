interface SparklineChartProps {
  data: { date: string; count: number }[]
}

export function SparklineChart({ data }: SparklineChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">No data for this period.</p>
  }

  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-1.5">
      {data.map(({ date, count }) => (
        <div key={date} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 text-text-muted">{date}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-sm border border-border bg-bg-base">
            <div className="h-full rounded-sm bg-brand-primary" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-text-primary">{count}</span>
        </div>
      ))}
    </div>
  )
}
