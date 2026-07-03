'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Article } from '../../../lib/articles'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Article[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    const res = await fetch(`/api/articles/search?q=${encodeURIComponent(q)}`, { headers: { 'X-API-Key': '' } })
    const data = await res.json()
    setResults(data.items ?? [])
    setSearched(true)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Search knowledge base</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles…"
          className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent"
          aria-label="Search query"
        />
        <button
          type="submit"
          className="bg-accent text-white text-sm px-4 py-2 rounded-md hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          Search
        </button>
      </form>
      {searched && results.length === 0 && (
        <p className="text-muted text-sm">No articles match &ldquo;{q}&rdquo;.</p>
      )}
      <ul className="flex flex-col gap-3">
        {results.map(a => (
          <li key={a.article_id} className="bg-surface border border-border rounded-md p-4">
            <Link href={`/articles/${a.article_id}`} className="text-sm font-medium hover:text-accent transition-colors">
              {a.title}
            </Link>
            <p className="text-xs text-muted mt-1 line-clamp-2">{a.content.slice(0, 200)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
