import Link from 'next/link';
import { getAuditRecord } from '@/lib/api';
import { FlagBadge, StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const record = await getAuditRecord(params.id);

  return (
    <div className="space-y-6">
      <Link href="/audit" className="text-sm text-accent hover:text-accent-hover">
        ← Back to audit log
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audit record</h1>
        <StatusBadge allowed={record.allowed} />
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Channel</dt>
          <dd className="mt-1">{record.channel_id}</dd>
        </div>
        <div>
          <dt className="text-muted">Direction</dt>
          <dd className="mt-1">{record.direction}</dd>
        </div>
        <div>
          <dt className="text-muted">Time</dt>
          <dd className="mt-1">{new Date(record.created_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted">Audit ID</dt>
          <dd className="mt-1 font-mono text-xs">{record.audit_id}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="text-sm text-muted">Message (redacted)</div>
        <p className="mt-2 whitespace-pre-wrap text-sm">{record.message_clean}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="text-sm text-muted">Flags</div>
        {record.flags.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No flags raised.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {record.flags.map((flag, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <FlagBadge severity={flag.severity} />
                <span className="text-muted">{flag.type}</span>
                <span>{flag.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
