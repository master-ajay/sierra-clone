interface ConfidenceBadgeProps {
  score: number
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  let colorClass: string
  let label: string

  if (score >= 0.8) {
    colorClass = 'bg-success/20 text-success'
    label = 'High'
  } else if (score >= 0.5) {
    colorClass = 'bg-warning/20 text-warning'
    label = 'Medium'
  } else {
    colorClass = 'bg-danger/20 text-danger'
    label = 'Low'
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      <span>{label}</span>
      <span className="opacity-70">{(score * 100).toFixed(0)}%</span>
    </span>
  )
}
