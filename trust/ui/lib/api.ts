const BASE_URL = process.env.TRUST_API_URL ?? 'http://localhost:8500';
const API_KEY = process.env.TRUST_API_KEY ?? 'change-me';

export type Flag = {
  type: 'pii' | 'prompt_injection' | 'rate_limit';
  detail: string;
  severity: 'warn' | 'block';
};

export type AuditRecord = {
  audit_id: string;
  channel_id: string;
  direction: string;
  message_clean: string;
  flags: Flag[];
  allowed: boolean;
  created_at: string;
};

export type Stats = {
  total_checks: number;
  total_blocked: number;
  flags_by_type: { pii: number; prompt_injection: number; rate_limit: number };
  block_rate: number;
};

export type RateLimitState = {
  channel_id: string;
  current_count: number;
  limit: number;
  window_seconds: number;
};

async function trustFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-API-Key': API_KEY },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Trust API ${path} failed: ${res.status}`);
  }
  return res.json();
}

export function getStats(): Promise<Stats> {
  return trustFetch<Stats>('/v1/stats');
}

export function listAudit(params: { cursor?: string; limit?: number } = {}): Promise<{
  items: AuditRecord[];
  next_cursor: string | null;
}> {
  const query = new URLSearchParams();
  if (params.cursor) query.set('cursor', params.cursor);
  query.set('limit', String(params.limit ?? 20));
  return trustFetch(`/v1/audit?${query.toString()}`);
}

export function getAuditRecord(auditId: string): Promise<AuditRecord> {
  return trustFetch(`/v1/audit/${auditId}`);
}

export function getRateLimit(channelId: string): Promise<RateLimitState> {
  return trustFetch(`/v1/rate-limit/${channelId}`);
}

// Trust's API surface has no "list channels" endpoint (v1 scope), so the
// rate-limits page derives the set of known channels from recent audit
// activity rather than requiring a new admin endpoint just for this table.
export async function listKnownChannelIds(): Promise<string[]> {
  const { items } = await listAudit({ limit: 200 });
  return Array.from(new Set(items.map((item) => item.channel_id)));
}
