export type NavKey = 'insights' | 'sessions' | 'search' | 'top-questions'

const ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: 'insights', label: 'Insights', href: '/insights' },
  { key: 'sessions', label: 'Sessions', href: '/sessions' },
  { key: 'search', label: 'Search', href: '/search' },
  { key: 'top-questions', label: 'Top Questions', href: '/top-questions' },
]

export function explorerNav(active: NavKey) {
  return ITEMS.map((item) => ({ label: item.label, href: item.href, active: item.key === active }))
}
