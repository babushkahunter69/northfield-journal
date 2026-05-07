export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminToastViewport } from '@/components/admin/admin-toast-viewport';

export default function AdminDashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-admin-shell="true" className="admin-light min-h-screen bg-[#f7f4ee] text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#e2d9cb] pb-4 lg:hidden">
              <Link
                href="/admin/posts"
                className="font-serif text-xl font-semibold text-[#0f172a]"
              >
                Northfield <span className="text-[#9a6730]">Journal</span>
              </Link>

              <Link
                href="/api/auth/logout"
                className="text-sm text-slate-500 transition hover:text-red-600"
              >
                Sign out
              </Link>
            </div>

            {children}
            <AdminToastViewport />
          </div>
        </div>
      </div>
    </div>
  );
}