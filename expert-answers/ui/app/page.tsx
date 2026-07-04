'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AppShell,
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  Table,
  type BadgeStatus,
  type TableColumn,
} from 'design-system';
import type { Article, ArticleStatus } from '@/lib/api';

const NAV = [
  { label: 'Articles', href: '/', active: true },
  { label: 'Submit resolution', href: '/resolutions/new', active: false },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

function statusToBadge(status: ArticleStatus): BadgeStatus {
  if (status === 'published') return 'success';
  if (status === 'approved') return 'info';
  if (status === 'pending_review') return 'warning';
  return 'error';
}

export default function ArticleQueuePage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');

  async function load() {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (topic) query.set('topic', topic);
    const res = await fetch(`/api/articles${query.toString() ? `?${query.toString()}` : ''}`);
    const data = await res.json();
    setArticles(data.items ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, topic]);

  const columns: TableColumn<Article>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link
          href={`/articles/${row.article_id}`}
          className="font-medium text-brand-primary hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    { key: 'topic', header: 'Topic', render: (row) => row.topic ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={statusToBadge(row.status)}>{row.status}</Badge>,
    },
  ];

  return (
    <AppShell
      productName="Expert Answers"
      nav={NAV}
      title="Article queue"
      actions={
        <Link href="/resolutions/new">
          <Button>Submit resolution</Button>
        </Link>
      }
    >
      <div className="mb-4 flex max-w-md gap-3">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
        <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
      </div>

      {articles === null ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : articles.length === 0 ? (
        <EmptyState
          heading="No articles yet"
          body="Submit a resolved conversation to generate the first draft article."
          action={{ label: 'Submit resolution', onClick: () => (window.location.href = '/resolutions/new') }}
        />
      ) : (
        <Table columns={columns} data={articles} rowKey="article_id" emptyMessage="No articles yet" />
      )}
    </AppShell>
  );
}
