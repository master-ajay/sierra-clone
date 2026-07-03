import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = { title: 'Explorer — Conversation Analytics' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-base text-gray-100 min-h-screen flex" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <nav className="w-52 shrink-0 bg-surface border-r border-border flex flex-col p-4 gap-1">
          <span className="text-xs font-semibold text-muted uppercase tracking-widest mb-4 px-2">Explorer</span>
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/sessions">Sessions</NavLink>
          <NavLink href="/search">Search</NavLink>
          <NavLink href="/top-questions">Top Questions</NavLink>
        </nav>
        <main className="flex-1 p-8 max-w-5xl">{children}</main>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      {children}
    </Link>
  )
}
