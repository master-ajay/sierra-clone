const BASE_URL = process.env.EXPERT_ANSWERS_API_URL ?? 'http://localhost:8600';
const API_KEY = process.env.EXPERT_ANSWERS_API_KEY ?? 'change-me';

export type ResolutionStatus = 'pending_draft' | 'draft_failed' | 'drafted';

export type Resolution = {
  resolution_id: string;
  conversation_id: string;
  adp_session_id: string | null;
  resolution_note: string;
  topic: string | null;
  status: ResolutionStatus;
  created_at: string;
};

export type ArticleStatus = 'pending_review' | 'approved' | 'rejected' | 'published';

export type Article = {
  article_id: string;
  resolution_id: string;
  title: string;
  body: string;
  cited_excerpt: string;
  topic: string | null;
  status: ArticleStatus;
  source_conversation_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

async function eaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message ?? `Expert Answers API ${path} failed: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export function submitResolution(body: {
  conversation_id: string;
  transcript?: { role: string; content: string }[];
  adp_session_id?: string;
  resolution_note: string;
  topic?: string;
}): Promise<{ resolution: Resolution; article: Article | null }> {
  return eaFetch('/v1/resolutions', { method: 'POST', body: JSON.stringify(body) });
}

export function retryResolution(
  resolutionId: string
): Promise<{ resolution: Resolution; article: Article | null }> {
  return eaFetch(`/v1/resolutions/${resolutionId}/retry`, { method: 'POST' });
}

export function listArticles(params: {
  status?: string;
  topic?: string;
} = {}): Promise<{ items: Article[]; next_cursor: string | null }> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.topic) query.set('topic', params.topic);
  const qs = query.toString();
  return eaFetch(`/v1/articles${qs ? `?${qs}` : ''}`);
}

export function getArticle(articleId: string): Promise<Article> {
  return eaFetch(`/v1/articles/${articleId}`);
}

export function updateArticle(
  articleId: string,
  body: { title?: string; body?: string; status?: 'approved' | 'rejected' | 'published' }
): Promise<Article> {
  return eaFetch(`/v1/articles/${articleId}`, { method: 'PATCH', body: JSON.stringify(body) });
}
