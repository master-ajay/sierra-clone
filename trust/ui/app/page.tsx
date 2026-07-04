import Link from 'next/link';
import { AppShell, Badge, Card, MetricCard, Table, type TableColumn } from 'design-system';
import { getStats, listAudit, type AuditRecord } from '@/lib/api';

export const dynamic = 'force-dynamic';

const NAV = [
  { label: 'Dashboard', href: '/', active: true },
  { label: 'Audit Log', href: '/audit', active: false },
  { label: 'Rate Limits', href: '/rate-limits', active: false },
];

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), listAudit({ limit: 20 })]);

  const columns: TableColumn<AuditRecord>[] = [
    {
      key: 'created_at',
      header: 'Time',
      render: (row) => new Date(row.created_at).toLocaleString(),
    },
    { key: 'channel_id', header: 'Channel' },
    { key: 'direction', header: 'Direction' },
    {
      key: 'allowed',
      header: 'Status',
      render: (row) => (
        <Badge status={row.allowed ? 'success' : 'error'}>{row.allowed ? 'passed' : 'blocked'}</Badge>
      ),
    },
  ];

  return (
    <AppShell productName="Trust & Reliability" nav={NAV} title="Dashboard">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Total checks" value={stats.total_checks} />
        <MetricCard label="Block rate" value={`${Math.round(stats.block_rate * 100)}%`} />
        <MetricCard label="Total blocked" value={stats.total_blocked} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Recent activity</h2>
          <Link href="/audit" className="text-sm text-brand-primary hover:underline">
            View audit log
          </Link>
        </div>
        <Table
          columns={columns}
          data={recent.items}
          rowKey="audit_id"
          emptyMessage="No checks recorded yet. Once a channel calls POST /v1/check, activity will show up here."
        />
      </Card>
    </AppShell>
  );
}
