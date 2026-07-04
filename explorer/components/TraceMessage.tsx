import { Badge } from 'design-system'

interface MessageMetadata {
  citations?: string[]
  confidence_score?: number
  guardrail_passed?: boolean
  action?: string
}

interface TraceMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata: MessageMetadata
}

function confidenceStatus(score: number): { status: 'success' | 'warning' | 'error'; label: string } {
  if (score >= 0.8) return { status: 'success', label: `High ${(score * 100).toFixed(0)}%` }
  if (score >= 0.5) return { status: 'warning', label: `Medium ${(score * 100).toFixed(0)}%` }
  return { status: 'error', label: `Low ${(score * 100).toFixed(0)}%` }
}

export function TraceMessage({ role, content, created_at, metadata }: TraceMessageProps) {
  const isAssistant = role === 'assistant'
  const isUser = role === 'user'

  return (
    <div
      className={`rounded-lg border p-4 ${
        isUser
          ? 'ml-8 border-border bg-bg-surface'
          : isAssistant
            ? 'mr-8 border-brand-primary/20 bg-bg-surface/60'
            : 'border-border/50 bg-bg-surface/30 text-sm italic text-text-muted'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${
            isUser ? 'text-brand-primary' : isAssistant ? 'text-status-success' : 'text-text-muted'
          }`}
        >
          {role}
        </span>
        <span className="text-xs text-text-muted">{new Date(created_at).toLocaleString()}</span>
      </div>

      <p className="whitespace-pre-wrap text-sm text-text-primary">{content}</p>

      {isAssistant && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {typeof metadata.confidence_score === 'number' &&
            (() => {
              const { status, label } = confidenceStatus(metadata.confidence_score)
              return <Badge status={status}>{label}</Badge>
            })()}
          {typeof metadata.guardrail_passed === 'boolean' && (
            <Badge status={metadata.guardrail_passed ? 'success' : 'error'}>
              {metadata.guardrail_passed ? 'Guardrail passed' : 'Guardrail failed'}
            </Badge>
          )}
          {metadata.action && (
            <span className="rounded-full border border-border bg-bg-surface px-2 py-0.5 text-xs text-text-muted">
              action: {metadata.action}
            </span>
          )}
        </div>
      )}

      {isAssistant && metadata.citations && metadata.citations.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-muted">Citations</p>
          <ul className="space-y-1">
            {metadata.citations.map((c, i) => (
              <li key={i} className="truncate text-xs text-brand-primary hover:underline">
                <a href={c} target="_blank" rel="noopener noreferrer">
                  {c}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
