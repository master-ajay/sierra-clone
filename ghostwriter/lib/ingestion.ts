export interface IngestResult {
  success: boolean
  error?: string
}

export async function ingestArticle(article_id: string, content: string): Promise<IngestResult> {
  const runtimeUrl = process.env.GHOSTWRITER_RUNTIME_URL ?? 'http://localhost:8001'
  try {
    const res = await fetch(`${runtimeUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents: [{ content, source: article_id }] }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('ingest_failed', res.status, article_id, body)
      return { success: false, error: `Runtime returned ${res.status}: ${body}` }
    }
    return { success: true }
  } catch (err) {
    console.error('ingest_error', article_id, err)
    return { success: false, error: String(err) }
  }
}

export async function removeArticle(article_id: string): Promise<void> {
  const runtimeUrl = process.env.GHOSTWRITER_RUNTIME_URL ?? 'http://localhost:8001'
  try {
    const res = await fetch(`${runtimeUrl}/v1/knowledge-base/source/${encodeURIComponent(article_id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      console.error('remove_article_failed', res.status, article_id)
    }
  } catch (err) {
    console.error('remove_article_error', article_id, err)
  }
}
