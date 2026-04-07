'use client';

import { useState } from 'react';

const initialState = {
  full_name: '',
  email: '',
  bio: '',
  proposed_title: '',
  topic_category: 'Student Success',
  target_keyword: '',
  article_angle: '',
  target_audience: '',
  source_links: '',
  portfolio_url: '',
  linkedin_url: '',
  article_content: '',
  notes: '',
  consent_original: true
};

export function GuestPostForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const res = await fetch('/api/guest-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || 'Something went wrong.');
      setLoading(false);
      return;
    }

    setForm(initialState);
    setStatus('Pitch received. If it fits the publication, the editor can review and publish it from the dashboard.');
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="paper space-y-5 p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Full name">
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </Field>
        <Field label="Email">
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </Field>
      </div>

      <Field label="Short bio">
        <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Portfolio or website">
          <input value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </Field>
        <Field label="LinkedIn profile">
          <input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </Field>
      </div>

      <Field label="Proposed title">
        <input required value={form.proposed_title} onChange={(e) => setForm({ ...form, proposed_title: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Section">
          <select value={form.topic_category} onChange={(e) => setForm({ ...form, topic_category: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option>Student Success</option>
            <option>Teaching Craft</option>
            <option>Higher Education</option>
            <option>School Leadership</option>
            <option>EdTech</option>
            <option>Scholarships & Access</option>
            <option>Academic Writing</option>
          </select>
        </Field>
        <Field label="Primary SEO keyword">
          <input value={form.target_keyword} onChange={(e) => setForm({ ...form, target_keyword: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Editorial angle">
          <textarea rows={3} value={form.article_angle} onChange={(e) => setForm({ ...form, article_angle: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </Field>
        <Field label="Target audience">
          <textarea rows={3} value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </Field>
      </div>

      <Field label="Sources or reference links">
        <textarea rows={3} value={form.source_links} onChange={(e) => setForm({ ...form, source_links: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
      </Field>

      <Field label="Article draft (Markdown or plain text)">
        <textarea required rows={16} value={form.article_content} onChange={(e) => setForm({ ...form, article_content: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
      </Field>

      <Field label="Notes for the editor">
        <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
      </Field>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-stone-50 px-4 py-4 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.consent_original}
          onChange={(e) => setForm({ ...form, consent_original: e.target.checked })}
          className="mt-1 h-4 w-4"
        />
        <span>
          I confirm this submission is original, fact-checked to the best of my ability, and not mass-produced or generated for multiple sites.
        </span>
      </label>

      <button disabled={loading} className="rounded-2xl bg-brand-700 px-5 py-3 font-semibold text-white transition hover:bg-brand-800 disabled:opacity-70">
        {loading ? 'Submitting...' : 'Submit editorial pitch'}
      </button>

      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
