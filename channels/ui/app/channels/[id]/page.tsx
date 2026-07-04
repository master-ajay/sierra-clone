'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Modal,
  MetricCard,
  useToast,
  type BadgeStatus,
} from 'design-system';
import type { Channel, ChannelSnippet, ChannelStats } from '@/lib/api';

const NAV = [{ label: 'Channels', href: '/', active: true }];

function statusToBadge(status: Channel['status']): BadgeStatus {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'error';
}

export default function ChannelDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [snippet, setSnippet] = useState<ChannelSnippet | null>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  async function load() {
    const [channelRes, statsRes, snippetRes] = await Promise.all([
      fetch(`/api/channels/${params.id}`),
      fetch(`/api/channels/${params.id}/stats`),
      fetch(`/api/channels/${params.id}/snippet`),
    ]);
    setChannel(await channelRes.json());
    setStats(await statsRes.json());
    setSnippet(await snippetRes.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function togglePause() {
    if (!channel) return;
    const nextStatus = channel.status === 'active' ? 'paused' : 'active';
    const res = await fetch(`/api/channels/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      showToast({ message: 'Failed to update channel', variant: 'error' });
      return;
    }
    showToast({ message: `Channel ${nextStatus}`, variant: 'success' });
    await load();
  }

  async function handleRevoke() {
    const res = await fetch(`/api/channels/${params.id}`, { method: 'DELETE' });
    if (!res.ok) {
      showToast({ message: 'Failed to revoke channel', variant: 'error' });
      return;
    }
    showToast({ message: 'Channel revoked', variant: 'success' });
    router.push('/');
  }

  if (!channel || !stats || !snippet) {
    return (
      <AppShell productName="Channels" nav={NAV} title="Channel">
        <p className="text-sm text-text-muted">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      productName="Channels"
      nav={NAV}
      title={channel.name}
      actions={
        <>
          {channel.status !== 'revoked' && (
            <Button variant="secondary" onClick={togglePause}>
              {channel.status === 'active' ? 'Pause' : 'Resume'}
            </Button>
          )}
          {channel.status !== 'revoked' && (
            <Button variant="destructive" onClick={() => setRevokeModalOpen(true)}>
              Revoke
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Badge status={statusToBadge(channel.status)}>{channel.status}</Badge>
          <span className="text-sm text-text-muted">{channel.type}</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Total messages" value={stats.total_messages} />
          <MetricCard label="Total sessions" value={stats.total_sessions} />
          <MetricCard label="Last active" value={stats.last_active_at ?? 'Never'} />
        </div>

        <Card>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Embed snippet</h3>
          <pre className="overflow-x-auto rounded-md bg-bg-base p-3 text-xs text-text-primary">
            {snippet.snippet}
          </pre>
        </Card>
      </div>

      <Modal
        open={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        title="Revoke channel"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            This immediately disables the channel key. Message history is retained. This
            cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRevokeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              Revoke channel
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
