import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { siteConfig } from '@/lib/constants';
export const metadata: Metadata = { title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` }, description: siteConfig.description, keywords: siteConfig.defaultKeywords, metadataBase: new URL('https://northfieldjournal.com') };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className="text-slate-900 antialiased"><div className="relative min-h-screen overflow-x-hidden"><div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(231,185,103,0.18),transparent_58%)]" /><SiteHeader /><main className="relative">{children}</main><SiteFooter /></div></body></html>; }
