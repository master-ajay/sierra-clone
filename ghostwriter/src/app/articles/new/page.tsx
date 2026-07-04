import { AppShell } from 'design-system';
import { createArticleAction } from '../../../../lib/actions';

const NAV = [
  { label: 'Articles', href: '/', active: false },
  { label: 'Search', href: '/search', active: false },
  { label: 'New article', href: '/articles/new', active: true },
];

export default function NewArticlePage() {
  return (
    <AppShell productName="Ghostwriter" nav={NAV} title="New article">
      <form action={createArticleAction} className="flex max-w-xl flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-text-primary">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-sm font-medium text-text-primary">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            required
            className="min-h-[240px] rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <button
          type="submit"
          className="w-fit rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Create article
        </button>
      </form>
    </AppShell>
  );
}
