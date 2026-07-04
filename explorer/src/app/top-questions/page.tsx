import { AppShell, Table, EmptyState } from 'design-system'
import { explorerNav } from '../nav'

interface TopQuestion {
  question: string
  count: number
  example_session_id: string
}

async function fetchTopQuestions(window: string): Promise<TopQuestion[] | null> {
  try {
    const res = await fetch(`http://localhost:8400/api/top-questions?window=${window}&limit=20`, {
      headers: { 'X-API-Key': process.env.EXPLORER_API_KEY ?? 'change-me' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const WINDOWS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

const COLUMNS = [
  {
    key: 'question',
    header: 'Question',
    render: (q: TopQuestion) => (
      <a href={`/sessions/${q.example_session_id}`} className="hover:text-brand-primary">
        {q.question}
      </a>
    ),
  },
  {
    key: 'count',
    header: 'Count',
    render: (q: TopQuestion) => (
      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary">
        {q.count}×
      </span>
    ),
  },
]

export default async function TopQuestionsPage({
  searchParams,
}: {
  searchParams: { window?: string }
}) {
  const window = searchParams.window ?? '7d'
  const questions = await fetchTopQuestions(window)

  return (
    <AppShell
      nav={explorerNav('top-questions')}
      productName="Insights / Explorer"
      title="Top questions"
      actions={
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <a
              key={w.value}
              href={`/top-questions?window=${w.value}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                window === w.value
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {w.label}
            </a>
          ))}
        </div>
      }
    >
      {!questions ? (
        <p className="text-sm text-text-muted">Unable to load top questions.</p>
      ) : questions.length === 0 ? (
        <EmptyState heading="No questions" body="No questions found for this period." />
      ) : (
        <Table columns={COLUMNS} data={questions} rowKey="question" />
      )}
    </AppShell>
  )
}
