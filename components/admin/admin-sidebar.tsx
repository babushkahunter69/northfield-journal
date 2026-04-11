'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/posts', label: 'All Posts', icon: '🗂️' },
  { href: '/admin/posts/new', label: 'New Post', icon: '✍️' },
  { href: '/admin/editor', label: 'Legacy Editor', icon: '🛠️' }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[250px] shrink-0 border-r border-white/10 bg-[#0a0a0a] lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-6 py-7">
        <Link href="/admin/posts" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e0bb42] text-sm font-bold text-black">
            N
          </div>
          <div>
            <p className="font-semibold text-white">Northfield Journal</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Admin
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-5">
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/admin/posts' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-[#151515] text-white'
                    : 'text-white/65 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}