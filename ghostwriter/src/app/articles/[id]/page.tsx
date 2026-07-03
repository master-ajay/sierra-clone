import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '../../../../lib/db'
import { getArticle } from '../../../../lib/articles'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    indexed: 'bg-success/20 text-success',
    pending: 'bg-warning/20 text-warning',
    error: 'bg-danger/20 text-danger',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? ''}`}>{status}</span>
}

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  const db = getDb()
  const article = getArticle(db, params.id)
  if (!article) notFound()

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-4 gap-4">
        <h1 className="text-xl font-semibold">{article.title}</h1>
        <StatusBadge status={article.status} />
      </div>
      {article.status === 'error' && article.error_detail && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded text-sm text-danger">
          Indexing failed: {article.error_detail}
        </div>
      )}
      <div className="flex gap-4 text-xs text-muted mb-6">
        <span>{article.word_count} words</span>
        <span>Created {new Date(article.created_at).toLocaleDateString()}</span>
        <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
        {article.source_id && <span>Source ID: {article.source_id}</span>}
      </div>
      <pre className="bg-surface border border-border rounded-md p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
        {article.content.slice(0, 500)}{article.content.length > 500 ? '…' : ''}
      </pre>
      <div className="flex gap-3 mt-6">
        <Link
          href={`/articles/${article.article_id}/edit`}
          className="text-sm bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          Edit article
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-white px-3 py-2 rounded-md transition-colors">
          Back to articles
        </Link>
      </div>
    </div>
  )
}
