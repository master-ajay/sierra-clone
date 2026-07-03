interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
}

export function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}
