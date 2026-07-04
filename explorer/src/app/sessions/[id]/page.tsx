import { AppShell, Card } from 'design-system'
import { TraceMessage } from '../../../../components/TraceMessage'
import { explorerNav } from '../../nav'

interface MessageTrace {
  message_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata: {
    citations?: string[]
    confidence_score?: number
    guardrail_passed?: boolean
    action?: string
  }
}

interface TraceResponse {
  session: {
    session_id: string
    started_at: string
    message_count: number
  }
  messages: MessageTrace[]
}

async function fetchTrace(id: string): Promise<TraceResponse | null> {
  try {
    const res = await fetch(`http://localhost:8400/api/sessions/${id}`, {
      headers: { 'X-API-Key': process.env.EXPLORER_API_KEY ?? 'change-me' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function TracePage({ params }: { params: { id: string } }) {
  const data = await fetchTrace(params.id)

  return (
    <AppShell nav={explorerNav('sessions')} productName="Insights / Explorer" title="Conversation trace">
      <a href="/sessions" className="text-xs text-text-muted hover:text-text-primary">
        ← Back to sessions
      </a>

      {!data ? (
        <p className="mt-4 text-sm text-text-muted">Session not found or unable to load.</p>
      ) : (
        <>
          <p className="mb-4 mt-2 text-xs text-text-muted">
            Session {data.session.session_id} · Started {new Date(data.session.started_at).toLocaleString()} ·{' '}
            {data.messages.length} messages
          </p>
          <Card className="flex flex-col gap-4">
            {data.messages.map((m) => (
              <TraceMessage
                key={m.message_id}
                role={m.role}
                content={m.content}
                created_at={m.created_at}
                metadata={m.metadata}
              />
            ))}
          </Card>
        </>
      )}
    </AppShell>
  )
}
