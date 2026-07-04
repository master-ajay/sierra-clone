import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { ToastProvider } from 'design-system';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Agent Studio',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-bg-base font-sans text-text-primary">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
