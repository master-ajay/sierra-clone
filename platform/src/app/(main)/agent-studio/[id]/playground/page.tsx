"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCallRequest[];
  toolName?: string;
}

interface ConversationSummary {
  id: string;
  createdAt: string;
  messages: ChatMessage[];
}

export default function PlaygroundPage() {
  const { id } = useParams<{ id: string }>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingContent = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/agent-studio/agents/${id}/conversations`)
      .then((res) => res.json())
      .then((list: ConversationSummary[]) => setConversations(list));
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function startNewConversation() {
    const res = await fetch(`/api/agent-studio/agents/${id}/conversations`, { method: "POST" });
    const conversation = await res.json();
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
    setMessages([]);
  }

  function loadConversation(convId: string) {
    const found = conversations.find((c) => c.id === convId);
    setActiveId(convId);
    setMessages(found?.messages ?? []);
  }

  async function sendMessage() {
    if (!activeId || !input.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);
    setError(null);
    streamingContent.current = "";

    const res = await fetch(`/api/agent-studio/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage.content }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Request failed (${res.status})`);
      setStreaming(false);
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const event = JSON.parse(part.slice(6));
        if (event.type === "content") {
          streamingContent.current += event.delta;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: streamingContent.current };
            return next;
          });
        } else if (event.type === "tool_call") {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "tool", content: "", toolName: event.name },
            prev[prev.length - 1],
          ]);
        } else if (event.type === "done") {
          setMessages(event.messages);
        } else if (event.type === "error") {
          setError(event.message);
          setMessages((prev) => prev.slice(0, -1));
        }
      }
    }
    setStreaming(false);
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-4 gap-6">
      <aside className="col-span-1 flex flex-col">
        <Button size="sm" onClick={startNewConversation} className="mb-4 w-full">
          New chat
        </Button>
        <ul className="flex-1 space-y-1 overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => loadConversation(c.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  activeId === c.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {new Date(c.createdAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="col-span-3 flex h-full flex-col">
        <Card className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="transcript">
          <div ref={scrollRef} className="h-full space-y-3 overflow-y-auto">
            {messages.length === 0 && (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">
                {activeId ? "Say hello to get started." : "Start a new chat to begin."}
              </p>
            )}
            {messages.map((m, i) =>
              m.role === "tool" ? (
                <div key={i} className="text-xs italic text-muted-foreground">
                  called <code className="text-primary">{m.toolName}</code>
                </div>
              ) : (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <span
                    className={`inline-block max-w-[75%] rounded-md px-4 py-2.5 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              )
            )}
          </div>
        </Card>
        {error && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={!activeId || streaming}
            placeholder={activeId ? "Type a message…" : "Start a new chat first"}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!activeId || streaming}>
            Send message
          </Button>
        </div>
      </section>
    </div>
  );
}
