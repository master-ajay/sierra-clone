'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

const fieldClasses =
  'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
    router.push('/agents');
  }

  if (!loaded) return <p className="mx-auto max-w-2xl px-6 py-16 text-sm text-muted">Loading…</p>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/agents" className="text-sm text-muted transition-colors hover:text-white">
        ← Agents
      </Link>

      <h1 className="mb-8 mt-3 text-2xl font-semibold tracking-tight">Edit agent</h1>

      <div className="space-y-8">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClasses} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            placeholder="You are a helpful support agent for…"
            className={fieldClasses}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Knowledge</label>
            <button
              type="button"
              onClick={addKnowledge}
              className="text-sm text-accent transition-colors hover:text-accent-hover"
            >
              + Add snippet
            </button>
          </div>
          <div className="space-y-3">
            {knowledge.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                No knowledge snippets yet.
              </p>
            )}
            {knowledge.map((k, i) => (
              <div key={k.id} className="space-y-2 rounded-xl border border-border bg-surface p-4">
                <input
                  value={k.title}
                  onChange={(e) => updateKnowledge(i, 'title', e.target.value)}
                  placeholder="Title"
                  className={fieldClasses}
                />
                <textarea
                  value={k.content}
                  onChange={(e) => updateKnowledge(i, 'content', e.target.value)}
                  placeholder="Content"
                  rows={3}
                  className={fieldClasses}
                />
                <button
                  type="button"
                  onClick={() => removeKnowledge(i)}
                  className="text-sm text-red-400 transition-colors hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Tools</label>
          <div className="space-y-2">
            {ALL_TOOLS.map((tool) => (
              <label
                key={tool.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={enabledTools.includes(tool.name)}
                  onChange={() => toggleTool(tool.name)}
                  className="h-4 w-4 rounded border-border bg-surface-2 accent-accent"
                />
                {tool.label}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </main>
  );
}
