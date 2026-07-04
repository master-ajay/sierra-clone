import Link from 'next/link';
import { AppShell, Badge, Card, Table, type TableColumn } from 'design-system';
import { listAudit, type AuditRecord } from '@/lib/api';

export const dynamic = 'force-dynamic';

const NAV = [
  { label: 'Dashboard', href: '/', active: false },
  { label: 'Audit Log', href: '/audit', active: true },
  { label: 'Rate Limits', href: '/rate-limits', active: false },
];

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  const { items, next_cursor } = await listAudit({ cursor: searchParams.cursor, limit: 25 });

  const columns: TableColumn<AuditRecord>[] = [
    {
      key: 'created_at',
      header: 'Time',
      render: (row) => (
        <Link href={`/audit/${row.audit_id}`} className="text-brand-primary hover:underline">
          {new Date(row.created_at).toLocaleString()}
        </Link>
      ),
    },
    { key: 'channel_id', header: 'Channel' },
    { key: 'direction', header: 'Direction' },
    {
      key: 'flags',
      header: 'Flags',
      render: (row) =>
        row.flags.length === 0 ? (
          '—'
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.flags.map((flag, i) => (
              <Badge key={i} status={flag.severity === 'block' ? 'error' : 'warning'}>
                {flag.severity === 'block' ? 'blocked' : 'flagged'}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: 'allowed',
      header: 'Status',
      render: (row) => (
        <Badge status={row.allowed ? 'success' : 'error'}>{row.allowed ? 'passed' : 'blocked'}</Badge>
      ),
    },
  ];

  return (
    <AppShell productName="Trust & Reliability" nav={NAV} title="Audit Log">
      <Card>
        <Table columns={columns} data={items} rowKey="audit_id" emptyMessage="No audit records yet." />
      </Card>

      {next_cursor && (
        <Link
          href={`/audit?cursor=${encodeURIComponent(next_cursor)}`}
          className="mt-4 inline-block rounded-md border border-border px-4 py-2 text-sm text-text-primary hover:bg-bg-base"
        >
          Load older records
        </Link>
      )}
    </AppShell>
  );
}
