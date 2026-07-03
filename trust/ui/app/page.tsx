import Link from 'next/link';
import { getStats, listAudit } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

function BlockRateGauge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = rate > 0.1 ? 'text-block' : rate > 0.02 ? 'text-warn' : 'text-pass';
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="text-sm text-muted">Block rate</div>
      <div className={`mt-2 text-4xl font-semibold ${color}`}>{pct}%</div>
    </div>
  );
}

function FlagsBarChart({ flagsByType }: { flagsByType: { pii: number; prompt_injection: number; rate_limit: number } }) {
  const rows: { label: string; count: number }[] = [
    { label: 'PII', count: flagsByType.pii },
    { label: 'Prompt injection', count: flagsByType.prompt_injection },
    { label: 'Rate limit', count: flagsByType.rate_limit },
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="text-sm text-muted">Flags by type</div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{row.label}</span>
              <span>{row.count}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2">
              <div
                className="h-2 rounded-full bg-accent"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), listAudit({ limit: 20 })]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Safety signals across every channel — {stats.total_checks} checks processed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BlockRateGauge rate={stats.block_rate} />
        <FlagsBarChart flagsByType={stats.flags_by_type} />
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link href="/audit" className="text-sm text-accent hover:text-accent-hover">
            View audit log
          </Link>
        </div>
        {recent.items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">
            No checks recorded yet. Once a channel calls{' '}
            <code className="rounded bg-surface-2 px-1 py-0.5">POST /v1/check</code>, activity
            will show up here.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-6 py-2 font-medium">Time</th>
                <th className="px-6 py-2 font-medium">Channel</th>
                <th className="px-6 py-2 font-medium">Direction</th>
                <th className="px-6 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.items.slice(0, 20).map((item) => (
                <tr key={item.audit_id} className="border-b border-border last:border-0">
                  <td className="px-6 py-3 text-muted">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3">{item.channel_id}</td>
                  <td className="px-6 py-3 text-muted">{item.direction}</td>
                  <td className="px-6 py-3">
                    <StatusBadge allowed={item.allowed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
