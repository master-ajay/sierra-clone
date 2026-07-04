import Link from 'next/link';
import { AppShell, Badge, Card } from 'design-system';
import { getAuditRecord } from '@/lib/api';

export const dynamic = 'force-dynamic';

const NAV = [
  { label: 'Dashboard', href: '/', active: false },
  { label: 'Audit Log', href: '/audit', active: true },
  { label: 'Rate Limits', href: '/rate-limits', active: false },
];

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const record = await getAuditRecord(params.id);

  return (
    <AppShell
      productName="Trust & Reliability"
      nav={NAV}
      title="Audit record"
      actions={<Badge status={record.allowed ? 'success' : 'error'}>{record.allowed ? 'passed' : 'blocked'}</Badge>}
    >
      <div className="flex flex-col gap-4">
        <Link href="/audit" className="text-sm text-brand-primary hover:underline">
          ← Back to audit log
        </Link>

        <Card>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-text-muted">Channel</dt>
              <dd className="mt-1 text-text-primary">{record.channel_id}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Direction</dt>
              <dd className="mt-1 text-text-primary">{record.direction}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Time</dt>
              <dd className="mt-1 text-text-primary">{new Date(record.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Audit ID</dt>
              <dd className="mt-1 font-mono text-xs text-text-primary">{record.audit_id}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Message (redacted)</h3>
          <p className="whitespace-pre-wrap text-sm text-text-primary">{record.message_clean}</p>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Flags</h3>
          {record.flags.length === 0 ? (
            <p className="text-sm text-text-muted">No flags raised.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {record.flags.map((flag, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <Badge status={flag.severity === 'block' ? 'error' : 'warning'}>
                    {flag.severity === 'block' ? 'blocked' : 'flagged'}
                  </Badge>
                  <span className="text-text-muted">{flag.type}</span>
                  <span className="text-text-primary">{flag.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
