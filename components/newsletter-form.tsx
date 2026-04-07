'use client';

import { useState } from 'react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || 'Unable to subscribe right now.');
      setLoading(false);
      return;
    }

    setEmail('');
    setFullName('');
    setStatus('You are in. Use this list for launches, sponsorships, and audience building.');
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="paper p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Newsletter</p>
      <h3 className="display-font mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Build an owned audience from day one</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
        Capture readers who are not ready to buy or inquire yet. This makes monetization far easier later.
      </p>
      <div className="mt-6 grid gap-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
        />
        <button disabled={loading} className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70 dark:bg-brand-700 dark:hover:bg-brand-600">
          {loading ? 'Joining...' : 'Join the weekly briefing'}
        </button>
      </div>
      {status ? <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{status}</p> : null}
    </form>
  );
}
