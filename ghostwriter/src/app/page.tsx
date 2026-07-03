import Link from 'next/link'
import { getDb } from '../../lib/db'
import { listArticles } from '../../lib/articles'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    indexed: 'bg-success/20 text-success',
    pending: 'bg-warning/20 text-warning',
    error: 'bg-danger/20 text-danger',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  )
}

export default function ArticleListPage() {
  const db = getDb()
  const { items } = listArticles(db, null, null, 50)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Knowledge base</h1>
        <Link
          href="/articles/new"
          className="text-sm bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          New article
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-muted text-sm">No articles yet. Create your first article to get started.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-muted text-left">
              <th className="pb-2 font-medium">Title</th>
              <th className="pb-2 font-medium w-24">Status</th>
              <th className="pb-2 font-medium w-20 text-right">Words</th>
              <th className="pb-2 font-medium w-36 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map(a => (
              <tr key={a.article_id} className="border-b border-border/50 hover:bg-white/5">
                <td className="py-3 pr-4">
                  <Link href={`/articles/${a.article_id}`} className="hover:text-accent transition-colors">
                    {a.title}
                  </Link>
                  {a.status === 'error' && a.error_detail && (
                    <p className="text-xs text-danger mt-0.5 truncate max-w-xs">{a.error_detail}</p>
                  )}
                </td>
                <td className="py-3 pr-4"><StatusBadge status={a.status} /></td>
                <td className="py-3 text-right text-muted">{a.word_count}</td>
                <td className="py-3 text-right text-muted">{new Date(a.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
