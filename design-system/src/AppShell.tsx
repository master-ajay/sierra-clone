import { ReactNode } from 'react'

export interface NavItem {
  label: string
  href: string
  active: boolean
}

export interface AppShellProps {
  nav: NavItem[]
  productName: string
  title: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ nav, productName, title, actions, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-bg-surface p-4">
        <span className="mb-4 px-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
          {productName}
        </span>
        {nav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={
              item.active
                ? 'rounded-md bg-brand-primary/10 px-3 py-2 text-sm font-medium text-brand-primary'
                : 'rounded-md px-3 py-2 text-sm text-text-primary hover:bg-bg-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary'
            }
          >
            {item.label}
          </a>
        ))}
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-bg-surface px-6 py-4">
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
