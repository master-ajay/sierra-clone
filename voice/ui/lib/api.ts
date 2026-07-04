const BASE_URL = process.env.VOICE_API_URL ?? 'http://localhost:8700';
const API_KEY = process.env.VOICE_API_KEY ?? 'change-me';
const AGENT_STUDIO_URL = process.env.AGENT_STUDIO_URL ?? 'http://localhost:3000';

export type Line = {
  line_id: string;
  agent_id: string;
  adp_user_id: string;
  name: string;
  status: 'active' | 'paused' | 'revoked';
  line_key: string;
  created_at: string;
  updated_at: string;
};

export type Sentiment = { label: string; score: number };

export type TurnResult = {
  reply: string;
  sentiment: Sentiment;
  call_sentiment_trend: number[];
  escalation_recommended: boolean;
};

export type EndCallResult = {
  average_sentiment: number;
  trend: 'improving' | 'declining' | 'stable';
};

export type EscalateResult = {
  summary: string;
  turns: unknown[];
};

export type PaymentResult = {
  payment_id: string;
  call_id: string;
  masked_card_last4: string;
  amount: number;
  currency: string;
  status: 'collected' | 'blocked';
  created_at: string;
};

export type Agent = {
  id: string;
  name: string;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `Voice API ${path} failed: ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

async function lineFetch<T>(path: string, lineKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'X-Line-Key': lineKey, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `Voice API ${path} failed: ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

export function listLines(): Promise<{ items: Line[]; next_cursor: string | null }> {
  return adminFetch('/v1/lines');
}

export function getLine(lineId: string): Promise<Line> {
  return adminFetch(`/v1/lines/${lineId}`);
}

export function createLine(body: { agent_id: string; name: string }): Promise<Line> {
  return adminFetch('/v1/lines', { method: 'POST', body: JSON.stringify(body) });
}

export function updateLine(
  lineId: string,
  body: { name?: string; status?: 'active' | 'paused' }
): Promise<Line> {
  return adminFetch(`/v1/lines/${lineId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function revokeLine(lineId: string): Promise<void> {
  return adminFetch(`/v1/lines/${lineId}`, { method: 'DELETE' });
}

export function startCall(
  lineId: string,
  lineKey: string
): Promise<{ call_id: string; session_id: string }> {
  return lineFetch(`/v1/lines/${lineId}/calls`, lineKey, { method: 'POST', body: '{}' });
}

export function exchangeTurn(callId: string, lineKey: string, text: string): Promise<TurnResult> {
  return lineFetch(`/v1/calls/${callId}/turns`, lineKey, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function endCall(callId: string, lineKey: string): Promise<EndCallResult> {
  return lineFetch(`/v1/calls/${callId}/end`, lineKey, { method: 'POST', body: '{}' });
}

export function escalateCall(callId: string): Promise<EscalateResult> {
  return adminFetch(`/v1/calls/${callId}/escalate`, { method: 'POST' });
}

export function collectPayment(
  callId: string,
  body: { masked_card_last4: string; amount: number; currency: string }
): Promise<PaymentResult> {
  return adminFetch(`/v1/calls/${callId}/payment`, { method: 'POST', body: JSON.stringify(body) });
}

export async function listAgents(): Promise<Agent[]> {
  const res = await fetch(`${AGENT_STUDIO_URL}/api/agents`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Agent Studio API failed: ${res.status}`);
  }
  return res.json();
}
