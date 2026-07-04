'use client';

import { useEffect, useState } from 'react';
import { AppShell, Table, EmptyState, Button, Modal, Input } from 'design-system';

interface Agent {
  id: string;
  name: string;
  instructions: string;
  updatedAt: string;
}

const NAV = [{ label: 'Agents', href: '/agents', active: true }];

const COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    render: (agent: Agent) => (
      <a href={`/agents/${agent.id}/edit`} className="font-medium text-text-primary hover:text-brand-primary">
        {agent.name}
      </a>
    ),
  },
  {
    key: 'updatedAt',
    header: 'Updated',
    render: (agent: Agent) => new Date(agent.updatedAt).toLocaleString(),
  },
  {
    key: 'actions',
    header: '',
    render: (agent: Agent) => (
      <a href={`/agents/${agent.id}/playground`} className="text-sm text-brand-primary hover:text-brand-hover">
        Playground
      </a>
    ),
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => {
        setAgents(data);
        setLoading(false);
      });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const agent = await res.json();
    setAgents((prev) => [agent, ...prev]);
    setName('');
    setCreating(false);
    setModalOpen(false);
  }

  return (
    <AppShell
      nav={NAV}
      productName="Agent Studio"
      title="Agents"
      actions={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Create agent
        </Button>
      }
    >
      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : agents.length === 0 ? (
        <EmptyState
          heading="No agents yet"
          body="Define an agent's instructions, knowledge, and tools, then test it in the playground."
          action={{ label: 'Create agent', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <Table columns={COLUMNS} data={agents} rowKey="id" />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create agent">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Support Bot"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={creating || !name.trim()}>
              {creating ? 'Creating…' : 'Create agent'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
