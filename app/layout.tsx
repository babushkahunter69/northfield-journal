import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/constants';
import { AppShell } from '@/components/app-shell';

const siteUrl = 'https://northfieldjournal.com';
const socialImage = '/opengraph-image';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Northfield Journal - Practical Education Guides and Teaching Ideas',
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: siteConfig.defaultKeywords,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: siteConfig.name,
    title: 'Northfield Journal - Practical Education Guides and Teaching Ideas',
    description: siteConfig.description,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Northfield Journal - Practical Education Guides and Teaching Ideas',
    description: siteConfig.description,
    images: [socialImage]
  }
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