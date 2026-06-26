'use client';

import { useState } from 'react';

type NewsletterFormProps = {
  variant?: 'card' | 'hero';
};

export function NewsletterForm({ variant = 'card' }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Unable to subscribe right now.');
        return;
      }

      setEmail('');
      setFullName('');
      setStatus('You are in. Expect thoughtful weekly writing.');
    } catch {
      setError('Unable to subscribe right now.');
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'hero') {
    return (
      <div className="mt-8 max-w-2xl rounded-[28px] border border-brand-200 bg-white/80 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Join the weekly briefing for practical education ideas and new articles.
        </p>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            required
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            aria-label="Email address"
            className="min-h-[48px]"
          />

          <button
            type="submit"
            disabled={loading}
            className="button-primary min-h-[48px] px-7"
          >
            {loading ? 'Joining...' : 'Subscribe'}
          </button>
        </form>

        {status ? <p className="mt-3 text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    );
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
        Essays, classroom insights, and practical education strategies, curated without clutter.
      </p>

      <div className="mt-6 grid gap-3">
        <input
          name="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
        />

        <input
          required
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />

        <button
          type="submit"
          disabled={loading}
          className="button-primary mt-2"
        >
          {loading ? 'Joining...' : 'Join the weekly briefing'}
        </button>
      </div>

      {status ? <p className="mt-4 text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
