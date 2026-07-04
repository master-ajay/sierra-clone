import { notFound } from 'next/navigation';
import { AppShell, Badge, type BadgeStatus } from 'design-system';
import { getDb } from '../../../../lib/db';
import { getArticle, type Article } from '../../../../lib/articles';
import { reindexArticleAction, updateArticleAction } from '../../../../lib/actions';

const NAV = [
  { label: 'Articles', href: '/', active: false },
  { label: 'Search', href: '/search', active: false },
  { label: 'New article', href: '/articles/new', active: false },
];

function statusToBadge(status: Article['status']): BadgeStatus {
  if (status === 'indexed') return 'success';
  if (status === 'pending') return 'warning';
  return 'error';
}

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  const article = getArticle(getDb(), params.id);
  if (!article) {
    notFound();
  }

  const boundUpdate = updateArticleAction.bind(null, article.article_id);
  const boundReindex = reindexArticleAction.bind(null, article.article_id);

  return (
    <AppShell
      productName="Ghostwriter"
      nav={NAV}
      title={article.title}
      actions={
        <>
          <Badge status={statusToBadge(article.status)}>{article.status}</Badge>
          <form action={boundReindex}>
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-base"
            >
              Reindex
            </button>
          </form>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {article.status === 'error' && article.error_detail && (
          <p className="text-sm text-status-error">Ingestion error: {article.error_detail}</p>
        )}

        <form action={boundUpdate} className="flex max-w-xl flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium text-text-primary">
              Title
            </label>
            <input
              id="title"
              name="title"
              defaultValue={article.title}
              className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="content" className="text-sm font-medium text-text-primary">
              Content
            </label>
            <textarea
              id="content"
              name="content"
              defaultValue={article.content}
              className="min-h-[240px] rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <p className="text-xs text-text-muted">{article.word_count} words</p>
          <button
            type="submit"
            className="w-fit rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Save changes
          </button>
        </form>
      </div>
    </AppShell>
  );
}
