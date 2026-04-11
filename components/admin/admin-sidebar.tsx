'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/posts', label: 'All Posts', icon: '🗂️' },
  { href: '/admin/posts/new', label: 'New Post', icon: '✍️' },
  { href: '/admin/legacy-editor', label: 'Legacy Editor', icon: '🛠️' }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[#e2d9cb] bg-[#f3eee4] lg:flex lg:flex-col">
      <Link
        href="/admin/posts"
        className="flex items-center gap-3 border-b border-[#e2d9cb] px-6 py-6"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f1b3d] text-sm font-bold text-white">
          N
        </div>

        <div>
          <p className="font-serif text-xl font-semibold text-[#0f172a]">
            Northfield <span className="text-[#9a6730]">Journal</span>
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Editorial desk
          </p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin/posts' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? 'bg-[#0f1b3d] text-white'
                  : 'text-slate-700 hover:bg-white hover:text-[#0f172a]'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#e2d9cb] p-4">
        <Link
          href="/api/auth/logout"
          className="block text-center text-sm font-medium text-slate-500 transition hover:text-red-600"
        >
          Sign out
        </Link>
      </div>
    </aside>
  );
}