'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, Card, Input, Button, useToast } from 'design-system';

interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
}

const ALL_TOOLS = [
  { name: 'lookup_order', label: 'Look up order' },
  { name: 'check_refund_policy', label: 'Check refund policy' },
  { name: 'create_ticket', label: 'Create support ticket' },
];

// design-system has no Textarea component (v1 scope: Input, Select, Button,
// Card, Table, Badge, Modal, Toast, EmptyState, MetricCard, AppShell only),
// and it's merged/read-only infra now - styled with the same token utility
// classes Input itself uses, so it's still fully on the shared token set,
// no bespoke hex values.
const textareaClasses =
  'w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary';

function nav(id: string) {
  return [
    { label: 'Agents', href: '/agents', active: false },
    { label: 'Edit agent', href: `/agents/${id}/edit`, active: true },
  ];
}

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [knowledge, setKnowledge] = useState<KnowledgeSnippet[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((res) => res.json())
      .then((agent) => {
        setName(agent.name);
        setInstructions(agent.instructions);
        setKnowledge(agent.knowledge);
        setEnabledTools(agent.enabledTools);
        setLoaded(true);
      });
  }, [id]);

  function addKnowledge() {
    setKnowledge((prev) => [...prev, { id: crypto.randomUUID(), title: '', content: '' }]);
  }

  function updateKnowledge(index: number, field: 'title' | 'content', value: string) {
    setKnowledge((prev) => prev.map((k, i) => (i === index ? { ...k, [field]: value } : k)));
  }

  function removeKnowledge(index: number) {
    setKnowledge((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTool(toolName: string) {
    setEnabledTools((prev) => (prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]));
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, instructions, knowledge, enabledTools }),
    });
    setSaving(false);
    showToast({ message: 'Agent saved', variant: 'success' });
  }

  if (!loaded) {
    return (
      <AppShell nav={nav(id)} productName="Agent Studio" title="Edit agent">
        <p className="text-sm text-text-muted">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      nav={nav(id)}
      productName="Agent Studio"
      title="Edit agent"
      actions={
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save agent'}
        </Button>
      }
    >
      <div className="flex max-w-2xl flex-col gap-6">
        <Card>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </Card>

        <Card>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            placeholder="You are a helpful support agent for…"
            className={textareaClasses}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">Knowledge</span>
            <button
              type="button"
              onClick={addKnowledge}
              className="text-sm text-brand-primary hover:text-brand-hover"
            >
              + Add snippet
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {knowledge.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                No knowledge snippets yet.
              </p>
            )}
            {knowledge.map((k, i) => (
              <div key={k.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <Input
                  label="Title"
                  value={k.title}
                  onChange={(e) => updateKnowledge(i, 'title', e.target.value)}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Content</label>
                  <textarea
                    value={k.content}
                    onChange={(e) => updateKnowledge(i, 'content', e.target.value)}
                    rows={3}
                    className={textareaClasses}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeKnowledge(i)}
                  className="self-start text-sm text-status-error hover:opacity-80"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <span className="mb-3 block text-sm font-medium text-text-primary">Tools</span>
          <div className="flex flex-col gap-2">
            {ALL_TOOLS.map((tool) => (
              <label
                key={tool.name}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm text-text-primary"
              >
                <input
                  type="checkbox"
                  checked={enabledTools.includes(tool.name)}
                  onChange={() => toggleTool(tool.name)}
                  className="h-4 w-4 rounded border-border accent-brand-primary"
                />
                {tool.label}
              </label>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
