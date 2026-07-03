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
      return { success: false, error: `Runtime returned ${res.status}: ${body}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Best-effort: Agent Runtime v1 has no delete endpoint. Log the gap.
export async function removeArticle(article_id: string): Promise<void> {
  console.warn(`[ghostwriter] Article ${article_id} deleted from DB. Runtime index cleanup requires Agent Runtime v1.1.`)
}
