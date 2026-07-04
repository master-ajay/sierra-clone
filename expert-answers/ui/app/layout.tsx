import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from 'design-system';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expert Answers',
  description: 'Review AI-drafted knowledge articles from resolved conversations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
