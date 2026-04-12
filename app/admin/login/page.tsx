'use client';

import { useEffect, useState } from 'react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('/admin/posts');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextFrom = params.get('from');
    if (nextFrom) setFrom(nextFrom);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    setLoading(false);

    if (!res.ok) {
      setError('Invalid password');
      return;
    }

    window.location.href = from;
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-900 dark:bg-[#091225] dark:text-white flex items-center justify-center px-6 transition-colors">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0f1b3d] text-white font-bold mb-4 dark:bg-[#d6a55b] dark:text-[#0b1324]">
            N
          </div>

          <h1 className="font-serif text-3xl font-semibold text-[#0f172a] dark:text-white">
            Northfield <span className="text-[#9a6730] dark:text-[#d6a55b]">Journal</span>
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            Admin access to the editorial dashboard
          </p>
        </div>

        <div className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdfa] p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:bg-[#0d1930] dark:border-[#1d2b46] dark:shadow-[0_20px_50px_rgba(0,0,0,0.32)]">
          <h2 className="font-serif text-2xl font-semibold text-[#0f172a] dark:text-white mb-2">
            Sign in
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">
            Enter your password to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-[#d6cebf] bg-[#fffdfa] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/10 dark:bg-[#10203b] dark:border-[#2a3a59] dark:text-white dark:placeholder:text-slate-400 dark:focus:border-[#d6a55b] dark:focus:ring-[#d6a55b]/20"
                placeholder="Enter admin password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#0f1b3d] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#16254f] disabled:opacity-60 dark:bg-[#d6a55b] dark:text-[#0b1324] dark:hover:bg-[#e2b26a]"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}