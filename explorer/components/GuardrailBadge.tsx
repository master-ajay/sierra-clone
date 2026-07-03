interface GuardrailBadgeProps {
  passed: boolean
}

export function GuardrailBadge({ passed }: GuardrailBadgeProps) {
  return passed ? (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-success/20 text-success">
      Passed
    </span>
  ) : (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-danger/20 text-danger">
      Failed
    </span>
  )
}
