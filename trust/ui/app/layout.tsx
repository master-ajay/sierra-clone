import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Trust & Reliability',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
            <span className="text-sm font-semibold tracking-wide text-white">
              Trust &amp; Reliability
            </span>
            <div className="flex gap-4 text-sm text-muted">
              <Link
                href="/"
                className="rounded px-2 py-1 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Dashboard
              </Link>
              <Link
                href="/audit"
                className="rounded px-2 py-1 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Audit Log
              </Link>
              <Link
                href="/rate-limits"
                className="rounded px-2 py-1 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Rate Limits
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
