import type { AdpMessage } from './adp'

export interface TopQuestion {
  question: string
  count: number
  example_session_id: string
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function computeTopQuestions(messages: AdpMessage[], limit: number): TopQuestion[] {
  const userMessages = messages.filter(m => m.role === 'user')

  const groups = new Map<string, { count: number; example_session_id: string }>()
  for (const m of userMessages) {
    const key = normalize(m.content)
    if (!key) continue
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
    } else {
      groups.set(key, { count: 1, example_session_id: m.session_id })
    }
  }

  return Array.from(groups.entries())
    .map(([question, { count, example_session_id }]) => ({ question, count, example_session_id }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
