'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  instructions: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

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
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const agent = await res.json();
    setAgents((prev) => [agent, ...prev]);
    setName('');
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted">
          Define an agent&apos;s instructions, knowledge, and tools, then test it in the playground.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-8 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New agent name"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          Create agent
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          No agents yet. Create one above to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
            >
              <span className="font-medium">{agent.name}</span>
              <div className="flex gap-4 text-sm">
                <Link href={`/agents/${agent.id}/edit`} className="text-muted transition-colors hover:text-white">
                  Edit
                </Link>
                <Link
                  href={`/agents/${agent.id}/playground`}
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  Playground
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
