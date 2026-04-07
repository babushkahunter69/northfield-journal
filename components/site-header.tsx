import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-stone-50/85 backdrop-blur-xl">
      <div className="container-shell flex h-20 items-center justify-between gap-6">
        <Link href="/" className="min-w-0">
          <div className="display-font text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Northfield <span className="text-brand-700">Journal</span>
          </div>
          <p className="hidden text-xs uppercase tracking-[0.24em] text-slate-500 md:block">
            Education, carefully edited
          </p>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <Link href="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Home
          </Link>
          <Link href="/blog" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Journal
          </Link>
          <Link href="/about" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            About
          </Link>
          <Link href="/guest-post" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Contribute
          </Link>
          <Link href="/contact" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/guest-post"
            className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 sm:inline-flex"
          >
            Pitch an article
          </Link>
          <Link
            href="/admin/login"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Editor login
          </Link>
        </div>
      </div>
    </header>
  );
}