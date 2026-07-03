'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    fetch(`/api/articles/${params.id}`, { headers: { 'X-API-Key': '' } })
      .then(r => r.json())
      .then(d => { setTitle(d.title ?? ''); setContent(d.content ?? '') })
  }, [params.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const res = await fetch(`/api/articles/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': '' },
      body: JSON.stringify({ title, content }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error?.message ?? 'Save failed'); return }
    router.push(`/articles/${params.id}`)
  }

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return }
    setDeleting(true)
    await fetch(`/api/articles/${params.id}`, { method: 'DELETE', headers: { 'X-API-Key': '' } })
    router.push('/')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Edit article</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-muted mb-1" htmlFor="title">Title</label>
          <input
            id="title" value={title} onChange={e => setTitle(e.target.value)} required
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1" htmlFor="content">Content</label>
          <textarea
            id="content" value={content} onChange={e => setContent(e.target.value)} required rows={14}
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent resize-y font-mono"
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              type="submit" disabled={saving}
              className="bg-accent text-white text-sm px-5 py-2 rounded-md hover:bg-accent/80 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
            >
              {saving ? 'Saving…' : 'Save & reindex'}
            </button>
            <a href={`/articles/${params.id}`} className="text-sm text-muted hover:text-white px-3 py-2 rounded-md transition-colors">Cancel</a>
          </div>
          <button
            type="button" onClick={handleDelete} disabled={deleting}
            className={`text-sm px-4 py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-base ${confirm ? 'bg-danger text-white' : 'text-danger hover:bg-danger/10'}`}
          >
            {deleting ? 'Deleting…' : confirm ? 'Confirm delete' : 'Delete article'}
          </button>
        </div>
      </form>
    </div>
  )
}
