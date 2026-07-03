import Link from 'next/link'

interface SessionSummary {
  session_id: string
  started_at: string
  message_count: number
  first_user_message: string
  last_activity: string
}

interface SessionTableProps {
  sessions: SessionSummary[]
}

export function SessionTable({ sessions }: SessionTableProps) {
  if (sessions.length === 0) {
    return <p className="text-muted text-sm">No sessions found for this period.</p>
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border text-muted text-left">
          <th className="pb-2 font-medium">First message</th>
          <th className="pb-2 font-medium w-36">Started</th>
          <th className="pb-2 font-medium w-16 text-right">Msgs</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map(s => (
          <tr key={s.session_id} className="border-b border-border/50 hover:bg-white/5">
            <td className="py-3 pr-4">
              <Link
                href={`/sessions/${s.session_id}`}
                className="hover:text-accent transition-colors line-clamp-1"
              >
                {s.first_user_message || <span className="text-muted italic">No user message</span>}
              </Link>
            </td>
            <td className="py-3 pr-4 text-muted">
              {new Date(s.started_at).toLocaleDateString()}
            </td>
            <td className="py-3 text-right text-muted">{s.message_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
