"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
}

const ALL_TOOLS = [
  { name: "lookup_order", label: "Look up order" },
  { name: "check_refund_policy", label: "Check refund policy" },
  { name: "create_ticket", label: "Create support ticket" },
];

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeSnippet[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/agent-studio/agents/${id}`)
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
    setKnowledge((prev) => [...prev, { id: crypto.randomUUID(), title: "", content: "" }]);
  }

  function updateKnowledge(index: number, field: "title" | "content", value: string) {
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
    await fetch(`/api/agent-studio/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, instructions, knowledge, enabledTools }),
    });
    setSaving(false);
    toast.success("Agent saved");
  }

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit agent</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save agent"}
        </Button>
      </div>

      <Card className="p-4">
        <label className="mb-1.5 block text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Card>

      <Card className="p-4">
        <label className="mb-1.5 block text-sm font-medium">Instructions</label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={5}
          placeholder="You are a helpful support agent for…"
        />
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Knowledge</span>
          <button type="button" onClick={addKnowledge} className="text-sm text-primary hover:underline">
            + Add snippet
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {knowledge.length === 0 && (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No knowledge snippets yet.
            </p>
          )}
          {knowledge.map((k, i) => (
            <div key={k.id} className="flex flex-col gap-2 rounded-md border p-3">
              <Input
                placeholder="Title"
                value={k.title}
                onChange={(e) => updateKnowledge(i, "title", e.target.value)}
              />
              <Textarea
                value={k.content}
                onChange={(e) => updateKnowledge(i, "content", e.target.value)}
                rows={3}
              />
              <button
                type="button"
                onClick={() => removeKnowledge(i)}
                className="self-start text-sm text-destructive hover:opacity-80"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <span className="mb-3 block text-sm font-medium">Tools</span>
        <div className="flex flex-col gap-2">
          {ALL_TOOLS.map((tool) => (
            <label key={tool.name} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <Checkbox
                checked={enabledTools.includes(tool.name)}
                onCheckedChange={() => toggleTool(tool.name)}
              />
              {tool.label}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
