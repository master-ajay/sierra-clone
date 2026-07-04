'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, Badge, Button, Card, useToast, type BadgeStatus } from 'design-system';
import type { Article } from '@/lib/api';

const NAV = [
  { label: 'Articles', href: '/', active: true },
  { label: 'Submit resolution', href: '/resolutions/new', active: false },
];

function statusToBadge(status: Article['status']): BadgeStatus {
  if (status === 'published') return 'success';
  if (status === 'approved') return 'info';
  if (status === 'pending_review') return 'warning';
  return 'error';
}

export default function ArticleReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/articles/${params.id}`);
    const data = await res.json();
    setArticle(data);
    setTitle(data.title);
    setBody(data.body);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function saveEdits() {
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to save');
      setArticle(data);
      showToast({ message: 'Changes saved', variant: 'success' });
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function transition(status: 'approved' | 'rejected' | 'published') {
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `Failed to mark ${status}`);
      setArticle(data);
      showToast({ message: `Article ${status}`, variant: 'success' });
      if (status === 'rejected') {
        router.push('/');
      }
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!article) {
    return (
      <AppShell productName="Expert Answers" nav={NAV} title="Article">
        <p className="text-sm text-text-muted">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      productName="Expert Answers"
      nav={NAV}
      title={article.title}
      actions={
        <>
          <Badge status={statusToBadge(article.status)}>{article.status}</Badge>
          {article.status === 'pending_review' && (
            <>
              <Button variant="secondary" onClick={() => transition('rejected')} disabled={saving}>
                Reject
              </Button>
              <Button onClick={() => transition('approved')} disabled={saving}>
                Approve
              </Button>
            </>
          )}
          {article.status === 'approved' && (
            <Button onClick={() => transition('published')} disabled={saving}>
              Publish
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Cited excerpt</h3>
          <blockquote className="border-l-2 border-border pl-3 text-sm italic text-text-muted">
            {article.cited_excerpt}
          </blockquote>
        </Card>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Title</label>
          <input
            className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Body</label>
          <textarea
            className="min-h-[200px] rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div>
          <Button variant="secondary" onClick={saveEdits} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
