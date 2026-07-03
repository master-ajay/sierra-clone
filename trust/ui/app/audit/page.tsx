import Link from 'next/link';
import { listAudit } from '@/lib/api';
import { FlagBadge, StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  const { items, next_cursor } = await listAudit({ cursor: searchParams.cursor, limit: 25 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="mt-1 text-sm text-muted">
          Every request processed by the check pipeline, most recent first.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No audit records yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-6 py-2 font-medium">Time</th>
                <th className="px-6 py-2 font-medium">Channel</th>
                <th className="px-6 py-2 font-medium">Direction</th>
                <th className="px-6 py-2 font-medium">Flags</th>
                <th className="px-6 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.audit_id} className="border-b border-border last:border-0">
                  <td className="px-6 py-3 text-muted">
                    <Link
                      href={`/audit/${item.audit_id}`}
                      className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {new Date(item.created_at).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-6 py-3">{item.channel_id}</td>
                  <td className="px-6 py-3 text-muted">{item.direction}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.flags.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        item.flags.map((flag, i) => <FlagBadge key={i} severity={flag.severity} />)
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge allowed={item.allowed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {next_cursor && (
        <Link
          href={`/audit?cursor=${encodeURIComponent(next_cursor)}`}
          className="inline-block rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Load older records
        </Link>
      )}
    </div>
  );
}
