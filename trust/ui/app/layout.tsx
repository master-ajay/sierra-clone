import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { ToastProvider } from 'design-system';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Trust & Reliability',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
