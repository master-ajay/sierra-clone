'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell, Button, Card, Input, useToast } from 'design-system';
import type { Article, Resolution } from '@/lib/api';

const NAV = [
  { label: 'Articles', href: '/', active: false },
  { label: 'Submit resolution', href: '/resolutions/new', active: true },
];

export default function NewResolutionPage() {
  const { showToast } = useToast();
  const [conversationId, setConversationId] = useState('');
  const [sourceMode, setSourceMode] = useState<'transcript' | 'session'>('session');
  const [transcript, setTranscript] = useState('');
  const [adpSessionId, setAdpSessionId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ resolution: Resolution; article: Article | null } | null>(
    null
  );

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        conversation_id: conversationId,
        resolution_note: resolutionNote,
        topic: topic || undefined,
      };
      if (sourceMode === 'session') {
        body.adp_session_id = adpSessionId;
      } else {
        body.transcript = transcript
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            const [role, ...rest] = line.split(':');
            return { role: role.trim(), content: rest.join(':').trim() };
          });
      }
      const res = await fetch('/api/resolutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to submit resolution');
      }
      setResult(data);
      if (data.article) {
        showToast({ message: 'Draft article generated', variant: 'success' });
      } else {
        showToast({ message: 'Draft generation failed — you can retry below', variant: 'error' });
      }
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    if (!result) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/resolutions/${result.resolution.resolution_id}/retry`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Retry failed');
      }
      setResult(data);
      if (data.article) {
        showToast({ message: 'Draft article generated', variant: 'success' });
      } else {
        showToast({ message: 'Draft generation failed again', variant: 'error' });
      }
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell productName="Expert Answers" nav={NAV} title="Submit resolution">
      <div className="flex max-w-xl flex-col gap-4">
        <Input
          label="Conversation ID"
          value={conversationId}
          onChange={(e) => setConversationId(e.target.value)}
        />

        <div className="flex gap-2 text-sm">
          <Button
            size="sm"
            variant={sourceMode === 'session' ? 'primary' : 'secondary'}
            onClick={() => setSourceMode('session')}
          >
            From ADP session
          </Button>
          <Button
            size="sm"
            variant={sourceMode === 'transcript' ? 'primary' : 'secondary'}
            onClick={() => setSourceMode('transcript')}
          >
            Paste transcript
          </Button>
        </div>

        {sourceMode === 'session' ? (
          <Input
            label="ADP session ID"
            value={adpSessionId}
            onChange={(e) => setAdpSessionId(e.target.value)}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Transcript (one turn per line, &quot;role: content&quot;)
            </label>
            <textarea
              className="min-h-[120px] rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>
        )}

        <Input
          label="Resolution note"
          value={resolutionNote}
          onChange={(e) => setResolutionNote(e.target.value)}
        />
        <Input label="Topic (optional)" value={topic} onChange={(e) => setTopic(e.target.value)} />

        <Button
          onClick={handleSubmit}
          disabled={
            submitting ||
            !conversationId ||
            !resolutionNote ||
            (sourceMode === 'session' ? !adpSessionId : !transcript)
          }
        >
          {submitting ? 'Submitting…' : 'Submit resolution'}
        </Button>

        {result && (
          <Card>
            {result.article ? (
              <>
                <p className="text-sm text-text-primary">
                  Draft article created: <strong>{result.article.title}</strong>
                </p>
                <Link
                  href={`/articles/${result.article.article_id}`}
                  className="text-sm text-brand-primary hover:underline"
                >
                  Review it →
                </Link>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-status-error">
                  Draft generation failed for this resolution.
                </p>
                <Button size="sm" onClick={handleRetry} disabled={submitting}>
                  {submitting ? 'Retrying…' : 'Retry'}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
