import { ConfidenceBadge } from './ConfidenceBadge'
import { GuardrailBadge } from './GuardrailBadge'

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

export function TraceMessage({ role, content, created_at, metadata }: TraceMessageProps) {
  const isAssistant = role === 'assistant'
  const isUser = role === 'user'

  return (
    <div
      className={`rounded-lg p-4 border ${
        isUser
          ? 'bg-surface border-border ml-8'
          : isAssistant
          ? 'bg-surface/60 border-accent/20 mr-8'
          : 'bg-surface/30 border-border/50 text-muted text-sm italic'
      }`}
    >
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${
            isUser ? 'text-accent' : isAssistant ? 'text-success' : 'text-muted'
          }`}
        >
          {role}
        </span>
        <span className="text-xs text-muted">{new Date(created_at).toLocaleString()}</span>
      </div>

      <p className="text-sm text-gray-100 whitespace-pre-wrap">{content}</p>

      {isAssistant && (
        <div className="mt-3 flex flex-wrap gap-2 items-start">
          {typeof metadata.confidence_score === 'number' && (
            <ConfidenceBadge score={metadata.confidence_score} />
          )}
          {typeof metadata.guardrail_passed === 'boolean' && (
            <GuardrailBadge passed={metadata.guardrail_passed} />
          )}
          {metadata.action && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
              action: {metadata.action}
            </span>
          )}
        </div>
      )}

      {isAssistant && metadata.citations && metadata.citations.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">Citations</p>
          <ul className="space-y-1">
            {metadata.citations.map((c, i) => (
              <li key={i} className="text-xs text-accent hover:underline truncate">
                <a href={c} target="_blank" rel="noopener noreferrer">{c}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
