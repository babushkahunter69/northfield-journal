'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.adminRoute = 'true';
      document.body.classList.add('admin-body');
      return;
    }

    document.documentElement.dataset.adminRoute = 'false';
    document.body.classList.remove('admin-body');

    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return <div className="admin-route-shell min-h-screen bg-[#f7f4ee] text-slate-900">{children}</div>;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(231,185,103,0.18),transparent_58%)]" />
      <SiteHeader />
      <main className="relative">{children}</main>
      <SiteFooter />
    </div>
  );
}
