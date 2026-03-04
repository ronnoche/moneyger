import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClientShell } from '@/components/client-shell';
import { PwaProvider } from '@/components/pwa-provider';
import { AppSessionProvider } from '@/components/session-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Moneyger',
  description: 'Bucket-based budgeting app powered by Google Sheets',
  manifest: '/manifest.json',
};

const initThemeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('moneyger-theme');
      var theme = stored === 'light' || stored === 'dark'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (error) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initThemeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppSessionProvider>
          <PwaProvider>
            <ClientShell>{children}</ClientShell>
          </PwaProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
