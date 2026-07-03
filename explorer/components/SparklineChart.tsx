interface SparklineChartProps {
  data: { date: string; count: number }[]
}

export function SparklineChart({ data }: SparklineChartProps) {
  if (data.length === 0) {
    return <p className="text-muted text-sm">No data for this period.</p>
  }

  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-1.5">
      {data.map(({ date, count }) => (
        <div key={date} className="flex items-center gap-3 text-sm">
          <span className="text-muted w-24 shrink-0">{date}</span>
          <div className="flex-1 bg-surface rounded-sm h-5 overflow-hidden border border-border">
            <div
              className="h-full bg-accent rounded-sm"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-white w-8 text-right">{count}</span>
        </div>
      ))}
    </div>
  )
}
