'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AppShell,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Table,
  useToast,
  type BadgeStatus,
  type TableColumn,
} from 'design-system';
import type { Agent, Channel } from '@/lib/api';

const NAV = [{ label: 'Channels', href: '/', active: true }];

function statusToBadge(status: Channel['status']): BadgeStatus {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'error';
}

export default function ChannelsListPage() {
  const { showToast } = useToast();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [type, setType] = useState<'widget' | 'api'>('widget');
  const [submitting, setSubmitting] = useState(false);

  async function loadChannels() {
    const res = await fetch('/api/channels');
    const data = await res.json();
    setChannels(data.items ?? []);
  }

  useEffect(() => {
    loadChannels();
  }, []);

  async function openCreateModal() {
    const res = await fetch('/api/agents');
    const data = await res.json();
    setAgents(Array.isArray(data) ? data : []);
    setModalOpen(true);
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, name, type }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message ?? 'Failed to create channel');
      }
      showToast({ message: 'Channel created', variant: 'success' });
      setModalOpen(false);
      setName('');
      setAgentId('');
      await loadChannels();
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const columns: TableColumn<Channel>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <Link
          href={`/channels/${row.channel_id}`}
          className="font-medium text-brand-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    { key: 'type', header: 'Type' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={statusToBadge(row.status)}>{row.status}</Badge>,
    },
  ];

  return (
    <AppShell
      productName="Channels"
      nav={NAV}
      title="All channels"
      actions={
        <Button onClick={openCreateModal}>Create channel</Button>
      }
    >
      {channels === null ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : channels.length === 0 ? (
        <EmptyState
          heading="No channels yet"
          body="Create a channel to deploy a Studio agent to the web or an external system."
          action={{ label: 'Create channel', onClick: openCreateModal }}
        />
      ) : (
        <Table
          columns={columns}
          data={channels}
          rowKey="channel_id"
          emptyMessage="No channels yet"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create channel">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Agent"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            options={[
              { value: '', label: 'Select an agent' },
              ...agents.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as 'widget' | 'api')}
            options={[
              { value: 'widget', label: 'Widget (embeddable chat)' },
              { value: 'api', label: 'API (REST integration)' },
            ]}
          />
          <Button
            onClick={handleCreate}
            disabled={submitting || !name || !agentId}
          >
            {submitting ? 'Creating…' : 'Create channel'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
