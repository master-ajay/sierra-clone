import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from 'design-system'

export const metadata: Metadata = { title: 'Insights / Explorer' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg-base font-sans text-text-primary">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
