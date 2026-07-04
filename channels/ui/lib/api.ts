const BASE_URL = process.env.CHANNELS_API_URL ?? 'http://localhost:8200';
const API_KEY = process.env.CHANNELS_API_KEY ?? 'change-me';
const AGENT_STUDIO_URL = process.env.AGENT_STUDIO_URL ?? 'http://localhost:3000';

export type Channel = {
  channel_id: string;
  agent_id: string;
  name: string;
  type: 'widget' | 'api';
  status: 'active' | 'paused' | 'revoked';
  channel_key: string;
  created_at: string;
  updated_at: string;
};

export type ChannelStats = {
  channel_id: string;
  total_messages: number;
  total_sessions: number;
  last_active_at: string | null;
};

export type ChannelSnippet = {
  channel_id: string;
  type: string;
  snippet: string;
};

export type Agent = {
  id: string;
  name: string;
};

async function channelsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `Channels API ${path} failed: ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export function listChannels(): Promise<{ items: Channel[]; next_cursor: string | null }> {
  return channelsFetch('/v1/channels');
}

export function getChannel(channelId: string): Promise<Channel> {
  return channelsFetch(`/v1/channels/${channelId}`);
}

export function createChannel(body: {
  agent_id: string;
  name: string;
  type: 'widget' | 'api';
}): Promise<Channel> {
  return channelsFetch('/v1/channels', { method: 'POST', body: JSON.stringify(body) });
}

export function updateChannel(
  channelId: string,
  body: { name?: string; status?: 'active' | 'paused' }
): Promise<Channel> {
  return channelsFetch(`/v1/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function revokeChannel(channelId: string): Promise<void> {
  return channelsFetch(`/v1/channels/${channelId}`, { method: 'DELETE' });
}

export function getChannelStats(channelId: string): Promise<ChannelStats> {
  return channelsFetch(`/v1/channels/${channelId}/stats`);
}

export function getChannelSnippet(channelId: string): Promise<ChannelSnippet> {
  return channelsFetch(`/v1/channels/${channelId}/snippet`);
}

export async function listAgents(): Promise<Agent[]> {
  const res = await fetch(`${AGENT_STUDIO_URL}/api/agents`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Agent Studio API failed: ${res.status}`);
  }
  return res.json();
}
