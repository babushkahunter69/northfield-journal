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
    setStatus('You are in. Expect thoughtful weekly writing.');
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="paper p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
        Weekly briefing
      </p>

      <h3 className="display-font mt-4 text-[2.2rem] leading-tight text-slate-900">
        Thoughtful writing,<br />delivered weekly.
      </h3>

      <p className="mt-4 text-[15px] leading-7 text-slate-600 max-w-md">
        Essays, classroom insights, and practical education strategies — curated, not cluttered.
      </p>

      <div className="mt-6 grid gap-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
        />

        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />

        <button
          disabled={loading}
          className="button-primary mt-2"
        >
          {loading ? 'Joining...' : 'Join the weekly briefing'}
        </button>
      </div>

      {status ? (
        <p className="mt-4 text-sm text-slate-600">{status}</p>
      ) : null}
    </form>
  );
}