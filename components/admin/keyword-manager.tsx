'use client';

import { useState } from 'react';

type ContentKeyword = {
  id: string;
  keyword: string;
  cluster: string | null;
  search_intent: string | null;
  audience: string | null;
  priority: number;
  country_code: string | null;
  status: 'queued' | 'in_progress' | 'done' | 'skipped';
  last_generated_at: string | null;
  created_at: string;
};

function statusPillClass(status: ContentKeyword['status']) {
  switch (status) {
    case 'done':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'skipped':
      return 'bg-stone-200 text-stone-700 border border-stone-300';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

const inputClass =
  'w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-base text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b3d]/10';

export function KeywordManager({ initialKeywords }: { initialKeywords: ContentKeyword[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulkRaw, setBulkRaw] = useState('');
  const [form, setForm] = useState({
    keyword: '',
    cluster: 'student-success',
    search_intent: 'informational',
    audience: 'students',
    priority: 50,
    country_code: 'US'
  });

  async function addKeyword(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to save keyword.');

      setKeywords((prev) => [data.keyword, ...prev]);
      setForm((prev) => ({ ...prev, keyword: '' }));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to save keyword.');
    } finally {
      setSubmitting(false);
    }
  }

  async function importKeywords() {
    if (!bulkRaw.trim()) {
      window.alert('Paste keywords first.');
      return;
    }

    setImporting(true);

    try {
      const response = await fetch('/api/admin/keywords/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: bulkRaw })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to import keywords.');
      }

      setKeywords((prev) => [...(data.keywords || []).reverse(), ...prev]);
      setBulkRaw('');
      window.alert(`Imported ${data.imported} keywords.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import keywords.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">
          Automation
        </p>
        <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-[#0f172a]">
          Keyword Queue
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Add single keywords or bulk import dozens at once. The daily cron will pull from this
          queue and create editor-ready drafts automatically.
        </p>
      </div>

      <form
        onSubmit={addKeyword}
        className="grid gap-4 rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:grid-cols-2 xl:grid-cols-6"
      >
        <input
          className={inputClass}
          placeholder="Keyword"
          value={form.keyword}
          onChange={(e) => setForm((prev) => ({ ...prev, keyword: e.target.value }))}
        />
        <input
          className={inputClass}
          placeholder="Cluster"
          value={form.cluster}
          onChange={(e) => setForm((prev) => ({ ...prev, cluster: e.target.value }))}
        />
        <input
          className={inputClass}
          placeholder="Audience"
          value={form.audience}
          onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
        />
        <input
          className={inputClass}
          placeholder="Intent"
          value={form.search_intent}
          onChange={(e) => setForm((prev) => ({ ...prev, search_intent: e.target.value }))}
        />
        <input
          className={inputClass}
          type="number"
          placeholder="Priority"
          value={form.priority}
          onChange={(e) => setForm((prev) => ({ ...prev, priority: Number(e.target.value || 0) }))}
        />
        <button
          disabled={submitting}
          className="rounded-2xl bg-[#0f1b3d] px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Add keyword'}
        </button>
      </form>

      <div className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6730]">
          Bulk import
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Paste one keyword per line using:
          <br />
          <span className="font-mono text-xs">
            keyword, cluster, audience, intent, priority, country
          </span>
        </p>

        <textarea
          className="mt-4 min-h-[220px] w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-base leading-7 text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b3d]/10"
          placeholder={`how to study effectively, student-success, students, informational, 80, US
best note taking methods, student-success, students, informational, 70, US
classroom management strategies, teaching-craft, teachers, informational, 75, US`}
          value={bulkRaw}
          onChange={(e) => setBulkRaw(e.target.value)}
        />

        <div className="mt-4">
          <button
            type="button"
            onClick={importKeywords}
            disabled={importing}
            className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-[#fffdfa] disabled:opacity-60"
          >
            {importing ? 'Importing...' : 'Import keywords'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-[#e7dfd2] bg-[#f8f3ea] text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-6 py-5">Keyword</th>
                <th className="px-6 py-5">Cluster</th>
                <th className="px-6 py-5">Audience</th>
                <th className="px-6 py-5">Priority</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Last generated</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((item) => (
                <tr key={item.id} className="border-b border-[#efe7da] last:border-b-0">
                  <td className="px-6 py-4 text-sm font-medium text-[#0f172a]">{item.keyword}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.cluster || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.audience || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.priority}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {item.last_generated_at ? new Date(item.last_generated_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}