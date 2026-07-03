import { getRateLimit, listKnownChannelIds } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function RateLimitsPage() {
  const channelIds = await listKnownChannelIds();
  const states = await Promise.all(channelIds.map((id) => getRateLimit(id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Rate Limits</h1>
        <p className="mt-1 text-sm text-muted">
          Current request count against each channel&apos;s per-minute limit.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {states.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">
            No channel activity yet — this list is derived from recent audit records.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-6 py-2 font-medium">Channel</th>
                <th className="px-6 py-2 font-medium">Current window</th>
                <th className="px-6 py-2 font-medium">Limit</th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => {
                const nearLimit = state.current_count >= state.limit;
                return (
                  <tr key={state.channel_id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3">{state.channel_id}</td>
                    <td className={`px-6 py-3 ${nearLimit ? 'text-block' : ''}`}>
                      {state.current_count} / {state.limit} per {state.window_seconds}s
                    </td>
                    <td className="px-6 py-3 text-muted">{state.limit} rpm</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
