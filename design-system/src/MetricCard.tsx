import { Card } from './Card'

export interface MetricTrend {
  direction: 'up' | 'down'
  value: string
}

export interface MetricCardProps {
  label: string
  value: string | number
  trend?: MetricTrend
}

export function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-text-primary">{value}</span>
        {trend && (
          <span
            className={
              trend.direction === 'up'
                ? 'text-sm font-medium text-status-success'
                : 'text-sm font-medium text-status-error'
            }
          >
            {trend.value}
          </span>
        )}
      </div>
    </Card>
  )
}
