import { AppShell, Badge, Card, Table, type TableColumn } from 'design-system';
import { getRateLimit, listKnownChannelIds, type RateLimitState } from '@/lib/api';

export const dynamic = 'force-dynamic';

const NAV = [
  { label: 'Dashboard', href: '/', active: false },
  { label: 'Audit Log', href: '/audit', active: false },
  { label: 'Rate Limits', href: '/rate-limits', active: true },
];

export default async function RateLimitsPage() {
  const channelIds = await listKnownChannelIds();
  const states = await Promise.all(channelIds.map((id) => getRateLimit(id)));

  const columns: TableColumn<RateLimitState>[] = [
    { key: 'channel_id', header: 'Channel' },
    {
      key: 'current_count',
      header: 'Current window',
      render: (row) => `${row.current_count} / ${row.limit} per ${row.window_seconds}s`,
    },
    {
      key: 'limit',
      header: 'Status',
      render: (row) => (
        <Badge status={row.current_count >= row.limit ? 'error' : 'success'}>
          {row.current_count >= row.limit ? 'at limit' : 'ok'}
        </Badge>
      ),
    },
  ];

  return (
    <AppShell productName="Trust & Reliability" nav={NAV} title="Rate Limits">
      <Card>
        <Table
          columns={columns}
          data={states}
          rowKey="channel_id"
          emptyMessage="No channel activity yet — this list is derived from recent audit records."
        />
      </Card>
    </AppShell>
  );
}
