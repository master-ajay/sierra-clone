'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewArticlePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': '' },
      body: JSON.stringify({ title, content }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error?.message ?? 'Save failed'); return }
    router.push(`/articles/${data.article_id}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">New article</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-muted mb-1" htmlFor="title">Title</label>
          <input
            id="title" value={title} onChange={e => setTitle(e.target.value)} required
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent"
            placeholder="e.g. Return Policy"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1" htmlFor="content">Content</label>
          <textarea
            id="content" value={content} onChange={e => setContent(e.target.value)} required rows={14}
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent resize-y font-mono"
            placeholder="Write your article in plain text or Markdown…"
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit" disabled={saving}
            className="bg-accent text-white text-sm px-5 py-2 rounded-md hover:bg-accent/80 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            {saving ? 'Saving…' : 'Save & index'}
          </button>
          <a href="/" className="text-sm text-muted hover:text-white px-3 py-2 rounded-md transition-colors">Cancel</a>
        </div>
      </form>
    </div>
  )
}
