import Link from 'next/link';
import { AppShell, Badge, Button, EmptyState, MetricCard, Table, type BadgeStatus, type TableColumn } from 'design-system';
import { getDb } from '../../lib/db';
import { listArticles, type Article } from '../../lib/articles';

const NAV = [
  { label: 'Articles', href: '/', active: true },
  { label: 'Search', href: '/search', active: false },
  { label: 'New article', href: '/articles/new', active: false },
];

function statusToBadge(status: Article['status']): BadgeStatus {
  if (status === 'indexed') return 'success';
  if (status === 'pending') return 'warning';
  return 'error';
}

export default function ArticlesHomePage() {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as n FROM articles').get() as { n: number }).n;
  const indexed = (
    db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='indexed'").get() as { n: number }
  ).n;
  const pending = (
    db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='pending'").get() as { n: number }
  ).n;
  const errorCount = (
    db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='error'").get() as { n: number }
  ).n;
  const { items } = listArticles(db, null, null, 50);

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
    { key: 'word_count', header: 'Words' },
  ];

  return (
    <AppShell
      productName="Ghostwriter"
      nav={NAV}
      title="Articles"
      actions={
        <Link href="/articles/new">
          <Button>New article</Button>
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-3 gap-4">
        <MetricCard label="Total articles" value={total} />
        <MetricCard label="Indexed" value={indexed} />
        <MetricCard label="Pending / errors" value={`${pending} / ${errorCount}`} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          heading="No articles yet"
          body="Create your first knowledge base article using the button above to get started."
        />
      ) : (
        <Table columns={columns} data={items} rowKey="article_id" emptyMessage="No articles yet" />
      )}
    </AppShell>
  );
}
