export interface AdpSession {
  session_id: string
  user_id: string
  started_at: string
  last_activity: string
  message_count: number
}

export interface AdpMessage {
  message_id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata: {
    citations?: string[]
    confidence_score?: number
    guardrail_passed?: boolean
    action?: string
  }
}

export interface AdpSearchResult {
  message_id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

const ADP_URL = process.env.EXPLORER_ADP_URL ?? 'http://localhost:8100'
const ADP_KEY = process.env.EXPLORER_ADP_API_KEY ?? ''

function adpHeaders(): HeadersInit {
  return { 'X-API-Key': ADP_KEY, 'Content-Type': 'application/json' }
}

export async function fetchUserSessions(userId: string, window?: string): Promise<AdpSession[]> {
  const params = new URLSearchParams({ user_id: userId })
  if (window) params.set('window', window)
  const res = await fetch(`${ADP_URL}/v1/sessions?${params}`, { headers: adpHeaders() })
  if (!res.ok) return []
  const data = await res.json() as { items: AdpSession[] }
  return data.items ?? []
}

export async function fetchSessionMessages(sessionId: string): Promise<AdpMessage[]> {
  const res = await fetch(`${ADP_URL}/v1/sessions/${sessionId}/messages`, { headers: adpHeaders() })
  if (!res.ok) return []
  const data = await res.json() as { items: AdpMessage[] }
  return data.items ?? []
}

export async function fetchSession(sessionId: string): Promise<AdpSession | null> {
  const res = await fetch(`${ADP_URL}/v1/sessions/${sessionId}`, { headers: adpHeaders() })
  if (!res.ok) return null
  return res.json() as Promise<AdpSession>
}

export async function searchUserMessages(userId: string, q: string, window?: string): Promise<AdpSearchResult[]> {
  const params = new URLSearchParams({ q })
  if (window) params.set('window', window)
  const res = await fetch(`${ADP_URL}/v1/users/${userId}/search?${params}`, { headers: adpHeaders() })
  if (!res.ok) return []
  const data = await res.json() as { items: AdpSearchResult[] }
  return data.items ?? []
}
