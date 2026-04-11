'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('/admin/posts');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const nextFrom = params.get('from');

    if (nextFrom) {
      setFrom(nextFrom);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || 'Invalid password');
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError('Unable to sign in right now.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-16 lg:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="hidden lg:block">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#e0bb42]">
            Admin Access
          </p>

          <h1 className="font-serif text-5xl font-black leading-[1.05] text-white">
            Sign in to manage
            <br />
            <span className="text-[#e0bb42]">Northfield Journal</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/55">
            Access your publishing dashboard, create articles, edit posts, upload
            cover images, and manage the journal from one place.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Write', 'Create and publish articles'],
              ['Edit', 'Update existing content'],
              ['Manage', 'Review and organize posts']
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"
              >
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#e0bb42]">
                  {title}
                </div>
                <div className="text-sm leading-relaxed text-white/50">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xl lg:ml-auto">
          <div className="mb-8 flex items-center gap-3 justify-center lg:justify-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e0bb42] text-sm font-black text-black">
              N
            </div>
            <span className="font-serif text-2xl font-bold text-white">
              Northfield <span className="text-[#e0bb42]">Journal</span>
            </span>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0d0d0d] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] lg:p-10">
            <h2 className="font-serif text-3xl font-bold text-white">
              Admin Login
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Enter your password to access the publishing dashboard.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-[#090909] px-4 py-3 text-white placeholder:text-white/25 focus:border-[#e0bb42] focus:outline-none focus:ring-2 focus:ring-[#e0bb42]/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  required
                />
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#e0bb42] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-white/35 lg:text-left">
            Set your password in <code className="text-[#e0bb42]">.env.local</code>{' '}
            as <code className="text-[#e0bb42]">ADMIN_PASSWORD</code>.
          </p>
        </div>
      </div>
    </div>
  );
}