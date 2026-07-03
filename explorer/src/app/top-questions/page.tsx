interface TopQuestion {
  question: string
  count: number
  example_session_id: string
}

async function fetchTopQuestions(window: string): Promise<TopQuestion[] | null> {
  try {
    const res = await fetch(
      `http://localhost:8400/api/top-questions?window=${window}&limit=20`,
      {
        headers: { 'X-API-Key': process.env.EXPLORER_API_KEY ?? 'change-me' },
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function TopQuestionsPage({
  searchParams,
}: {
  searchParams: { window?: string }
}) {
  const window = searchParams.window ?? '7d'
  const questions = await fetchTopQuestions(window)

  const windows = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Top questions</h1>
        <div className="flex gap-2">
          {windows.map(w => (
            <a
              key={w.value}
              href={`/top-questions?window=${w.value}`}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                window === w.value
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-muted hover:text-white hover:border-white/20'
              }`}
            >
              {w.label}
            </a>
          ))}
        </div>
      </div>

      {!questions ? (
        <p className="text-muted text-sm">Unable to load top questions.</p>
      ) : questions.length === 0 ? (
        <p className="text-muted text-sm">No questions found for this period.</p>
      ) : (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={q.question} className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4">
              <span className="text-2xl font-bold text-muted w-8 shrink-0 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{q.question}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-accent/20 text-accent">
                {q.count}×
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
