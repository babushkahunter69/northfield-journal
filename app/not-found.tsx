import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f7f1e8] px-6 py-24 text-slate-900">
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
        <h1 className="font-serif text-4xl font-semibold">Page not found</h1>

        <p className="mt-4 text-lg leading-8 text-slate-600">
          This article may still be a draft or the link is incorrect.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/blog"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
          >
            Back to Journal
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#d8cdbb] bg-white px-6 py-3 text-sm font-semibold text-slate-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}