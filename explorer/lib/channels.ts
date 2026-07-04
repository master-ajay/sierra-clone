export interface Channel {
  channel_id: string
  agent_id: string
  adp_user_id: string
  name: string
  type: string
  status: string
}

const CHANNELS_URL = process.env.EXPLORER_CHANNELS_URL ?? 'http://localhost:8200'
const CHANNELS_KEY = process.env.EXPLORER_CHANNELS_API_KEY ?? ''

export async function fetchChannels(): Promise<Channel[]> {
  const res = await fetch(`${CHANNELS_URL}/v1/channels`, {
    headers: { 'X-API-Key': CHANNELS_KEY },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { items: Channel[] }
  return data.items ?? []
}
