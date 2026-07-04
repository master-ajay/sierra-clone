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
import type { Agent, Line } from '@/lib/api';

const NAV = [{ label: 'Lines', href: '/', active: true }];

function statusToBadge(status: Line['status']): BadgeStatus {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'error';
}

export default function LinesListPage() {
  const { showToast } = useToast();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadLines() {
    const res = await fetch('/api/lines');
    const data = await res.json();
    setLines(data.items ?? []);
  }

  useEffect(() => {
    loadLines();
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
      const res = await fetch('/api/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, name }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message ?? 'Failed to create line');
      }
      showToast({ message: 'Line created', variant: 'success' });
      setModalOpen(false);
      setName('');
      setAgentId('');
      await loadLines();
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const columns: TableColumn<Line>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <Link href={`/lines/${row.line_id}/call`} className="font-medium text-brand-primary hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={statusToBadge(row.status)}>{row.status}</Badge>,
    },
  ];

  return (
    <AppShell
      productName="Voice"
      nav={NAV}
      title="All lines"
      actions={<Button onClick={openCreateModal}>Create line</Button>}
    >
      {lines === null ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : lines.length === 0 ? (
        <EmptyState
          heading="No lines yet"
          body="Create a line to start simulating calls for a Studio agent."
          action={{ label: 'Create line', onClick: openCreateModal }}
        />
      ) : (
        <Table columns={columns} data={lines} rowKey="line_id" emptyMessage="No lines yet" />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create line">
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
          <Button onClick={handleCreate} disabled={submitting || !name || !agentId}>
            {submitting ? 'Creating…' : 'Create line'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
