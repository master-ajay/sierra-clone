import Link from 'next/link';
import { AppShell, Badge, Table, type BadgeStatus, type TableColumn } from 'design-system';
import { getDb } from '../../../lib/db';
import { searchArticles, type Article } from '../../../lib/articles';

const NAV = [
  { label: 'Articles', href: '/', active: false },
  { label: 'Search', href: '/search', active: true },
  { label: 'New article', href: '/articles/new', active: false },
];

function statusToBadge(status: Article['status']): BadgeStatus {
  if (status === 'indexed') return 'success';
  if (status === 'pending') return 'warning';
  return 'error';
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? '';
  const results = q ? searchArticles(getDb(), q, null, 50).items : [];

  const columns: TableColumn<Article>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link href={`/articles/${row.article_id}`} className="font-medium text-brand-primary hover:underline">
          {row.title}
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
    <AppShell productName="Ghostwriter" nav={NAV} title="Search">
      <form method="GET" className="mb-6 flex max-w-md gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search title or content…"
          className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Search
        </button>
      </form>

      {q && (
        <Table columns={columns} data={results} rowKey="article_id" emptyMessage="No matching articles" />
      )}
    </AppShell>
  );
}
