import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/constants';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: siteConfig.defaultKeywords,
  metadataBase: new URL('https://northfieldjournal.com')
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}