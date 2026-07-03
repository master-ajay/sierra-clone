import Link from 'next/link'
import { TraceMessage } from '../../../../components/TraceMessage'

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
    const res = await fetch(
      `http://localhost:8400/api/sessions/${id}`,
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

export default async function TracePage({ params }: { params: { id: string } }) {
  const data = await fetchTrace(params.id)

  return (
    <div>
      <div className="mb-6">
        <Link href="/sessions" className="text-xs text-muted hover:text-white transition-colors">
          ← Back to sessions
        </Link>
        <h1 className="text-xl font-semibold mt-2">Conversation trace</h1>
        {data && (
          <p className="text-xs text-muted mt-1">
            Session {data.session.session_id} · Started{' '}
            {new Date(data.session.started_at).toLocaleString()} · {data.messages.length} messages
          </p>
        )}
      </div>

      {!data ? (
        <p className="text-muted text-sm">Session not found or unable to load.</p>
      ) : (
        <div className="space-y-4">
          {data.messages.map(m => (
            <TraceMessage
              key={m.message_id}
              role={m.role}
              content={m.content}
              created_at={m.created_at}
              metadata={m.metadata}
            />
          ))}
        </div>
      )}
    </div>
  )
}
