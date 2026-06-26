'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showAdminToast } from '@/lib/admin/toast';

type KeywordStatus = 'review' | 'queued' | 'approved' | 'in_progress' | 'done' | 'skipped';

type ContentKeyword = {
  id: string;
  keyword: string;
  cluster: string | null;
  search_intent: string | null;
  audience: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
  priority: number;
  country_code: string | null;
  status: KeywordStatus;
  last_generated_at: string | null;
  created_at: string;
};

const inputClass =
  'w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b3d]/10';

const selectClass =
  'w-full appearance-none rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f1b3d]/10';

const clusterLabels: Record<string, string> = {
  'student-success': 'Student Success',
  'exam-prep': 'Exam Prep',
  'academic-writing': 'Academic Writing',
  'teaching-strategies': 'Teaching Strategies',
  'parent-guides': 'Parent Guides',
  'career-guidance': 'Career Guidance',
  edtech: 'EdTech',
  'math-learning': 'Math Learning',
  'science-learning': 'Science Learning',
  'reading-skills': 'Reading Skills',
  'special-education': 'Special Education',
  homeschooling: 'Homeschooling'
};

function pretty(value: string | null | undefined) {
  if (!value) return 'Unclustered';
  return clusterLabels[value] || value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusPill(status: KeywordStatus) {
  switch (status) {
    case 'review':
      return 'bg-sky-50 text-sky-800 border border-sky-200';
    case 'queued':
    case 'approved':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'done':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'in_progress':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'skipped':
      return 'bg-rose-50 text-rose-800 border border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

function statusLabel(status: KeywordStatus) {
  if (status === 'review') return 'Needs review';
  if (status === 'queued' || status === 'approved') return 'Approved';
  if (status === 'done') return 'Drafted';
  if (status === 'skipped') return 'Rejected';
  return 'Drafting';
}

function isRecent(item: ContentKeyword) {
  const created = new Date(item.created_at).getTime();
  return Number.isFinite(created) && Date.now() - created < 1000 * 60 * 60;
}

export function KeywordManager({ initialKeywords }: { initialKeywords: ContentKeyword[] }) {
  const router = useRouter();
  const [keywords, setKeywords] = useState(initialKeywords);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulkRaw, setBulkRaw] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'review' | 'queued' | 'done' | 'skipped' | 'all'>('review');
  const [clusterFilter, setClusterFilter] = useState('all');
  const [showRecent, setShowRecent] = useState(false);
  const [form, setForm] = useState({
    keyword: '',
    cluster: 'student-success',
    search_intent: 'informational',
    audience: 'students',
    priority: 50,
    country_code: 'US'
  });

  useEffect(() => {
    setKeywords(initialKeywords);
  }, [initialKeywords]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('generated') === '1') {
      setShowRecent(true);
      setStatusFilter('review');
    }
  }, []);

  const stats = useMemo(() => {
    return {
      review: keywords.filter((item) => item.status === 'review').length,
      queued: keywords.filter((item) => item.status === 'queued' || item.status === 'approved').length,
      done: keywords.filter((item) => item.status === 'done').length,
      skipped: keywords.filter((item) => item.status === 'skipped').length
    };
  }, [keywords]);

  const clusters = useMemo(() => {
    const values = new Set(keywords.map((item) => item.cluster).filter(Boolean) as string[]);
    return Array.from(values).sort((a, b) => pretty(a).localeCompare(pretty(b)));
  }, [keywords]);

  const recentKeywords = useMemo(
    () => keywords.filter((item) => item.status === 'review' && isRecent(item)).slice(0, 30),
    [keywords]
  );

  const filteredKeywords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return keywords
      .filter((item) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'queued') return item.status === 'queued' || item.status === 'approved';
        return item.status === statusFilter;
      })
      .filter((item) => (clusterFilter === 'all' ? true : item.cluster === clusterFilter))
      .filter((item) => {
        if (!term) return true;
        return [item.keyword, item.cluster, item.audience, item.search_intent, item.grade_band, item.subject_area]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .slice(0, 30);
  }, [keywords, search, statusFilter, clusterFilter]);

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
      setStatusFilter('queued');
      showAdminToast({ type: 'success', title: 'Keyword approved', description: 'The keyword was added to the draft queue.' });
    } catch (error) {
      showAdminToast({ type: 'error', title: 'Keyword save failed', description: error instanceof Error ? error.message : 'Unable to save keyword.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function importKeywords() {
    if (!bulkRaw.trim()) {
      showAdminToast({ type: 'info', title: 'Keywords required', description: 'Paste keywords first.' });
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
      if (!response.ok) throw new Error(data?.error || 'Unable to import keywords.');

      setBulkRaw('');
      showAdminToast({ type: 'success', title: 'Keywords imported', description: `Imported ${data.inserted || data.imported || 0} keywords.` });
      router.refresh();
    } catch (error) {
      showAdminToast({ type: 'error', title: 'Keyword import failed', description: error instanceof Error ? error.message : 'Unable to import keywords.' });
    } finally {
      setImporting(false);
    }
  }

  async function updateKeywordStatus(item: ContentKeyword, status: 'queued' | 'skipped') {
    const action = status === 'queued' ? 'Approve' : 'Reject';

    try {
      const response = await fetch('/api/admin/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `${action} failed.`);

      setKeywords((prev) => prev.map((keyword) => (keyword.id === item.id ? { ...keyword, status } : keyword)));
      showAdminToast({
        type: 'success',
        title: status === 'queued' ? 'Keyword approved' : 'Keyword rejected',
        description: status === 'queued' ? 'This keyword can now be drafted.' : 'This keyword will be skipped.'
      });
    } catch (error) {
      showAdminToast({ type: 'error', title: `${action} failed`, description: error instanceof Error ? error.message : `${action} failed.` });
    }
  }

  async function bulkUpdateRecent(status: 'queued' | 'skipped') {
    for (const item of recentKeywords) {
      await updateKeywordStatus(item, status);
    }
    router.refresh();
  }

  function renderKeywordCard(item: ContentKeyword) {
    return (
      <article key={item.id} className="rounded-[24px] border border-[#e6dccd] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPill(item.status)}`}>
                {statusLabel(item.status)}
              </span>
              {isRecent(item) ? <span className="rounded-full bg-[#fff3d8] px-3 py-1 text-xs font-semibold text-[#9a6730]">New</span> : null}
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-7 text-[#0f172a]">{item.keyword}</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full bg-[#f8f3ea] px-3 py-1">{pretty(item.cluster)}</span>
              {item.audience ? <span className="rounded-full bg-[#f8f3ea] px-3 py-1">{pretty(item.audience)}</span> : null}
              {item.grade_band ? <span className="rounded-full bg-[#f8f3ea] px-3 py-1">{pretty(item.grade_band)}</span> : null}
              <span className="rounded-full bg-[#f8f3ea] px-3 py-1">Priority {item.priority}</span>
            </div>
          </div>

          {item.status === 'review' ? (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => updateKeywordStatus(item, 'queued')}
                className="rounded-full bg-[#0f1b3d] px-4 py-2 text-sm font-semibold text-white"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => updateKeywordStatus(item, 'skipped')}
                className="rounded-full border border-[#e5c3bd] bg-white px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Reject
              </button>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">Northfield Journal Keywords</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#0f172a]">Keyword Review Desk</h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
              Review new education keywords before they enter the draft queue. Approve only the topics that feel useful, searchable, and aligned with Northfield Journal.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <button type="button" onClick={() => setStatusFilter('review')} className="rounded-[22px] border border-[#e6dccd] bg-white p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Needs review</p>
            <p className="mt-2 text-3xl font-semibold text-[#0f172a]">{stats.review}</p>
          </button>
          <button type="button" onClick={() => setStatusFilter('queued')} className="rounded-[22px] border border-[#e6dccd] bg-white p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Approved</p>
            <p className="mt-2 text-3xl font-semibold text-[#0f172a]">{stats.queued}</p>
          </button>
          <button type="button" onClick={() => setStatusFilter('done')} className="rounded-[22px] border border-[#e6dccd] bg-white p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Drafted</p>
            <p className="mt-2 text-3xl font-semibold text-[#0f172a]">{stats.done}</p>
          </button>
          <button type="button" onClick={() => setStatusFilter('skipped')} className="rounded-[22px] border border-[#e6dccd] bg-white p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rejected</p>
            <p className="mt-2 text-3xl font-semibold text-[#0f172a]">{stats.skipped}</p>
          </button>
        </div>
      </section>

      {showRecent && recentKeywords.length > 0 ? (
        <section className="rounded-[28px] border border-sky-200 bg-sky-50/60 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-800">Just generated</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#0f172a]">Review these new keyword ideas</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">Approved keywords move into Draft Next. Rejected keywords stay out of the article pipeline.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => bulkUpdateRecent('queued')} className="rounded-full bg-[#0f1b3d] px-4 py-2 text-sm font-semibold text-white">Approve all new</button>
              <button type="button" onClick={() => bulkUpdateRecent('skipped')} className="rounded-full border border-[#d9cfbf] bg-white px-4 py-2 text-sm font-semibold text-slate-700">Reject all new</button>
            </div>
          </div>
          <div className="mt-5 grid gap-3">{recentKeywords.map(renderKeywordCard)}</div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 md:col-span-1">
            <span className="text-sm font-semibold text-slate-700">Search</span>
            <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search keywords, clusters, audience..." />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Status</span>
            <select className={selectClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="review">Needs review</option>
              <option value="queued">Approved for drafting</option>
              <option value="done">Drafted</option>
              <option value="skipped">Rejected</option>
              <option value="all">All keywords</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Cluster</span>
            <select className={selectClass} value={clusterFilter} onChange={(event) => setClusterFilter(event.target.value)}>
              <option value="all">All clusters</option>
              {clusters.map((cluster) => <option key={cluster} value={cluster}>{pretty(cluster)}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {clusters.slice(0, 10).map((cluster) => (
            <button key={cluster} type="button" onClick={() => setClusterFilter(cluster)} className="rounded-full border border-[#e2d9cb] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              {pretty(cluster)}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3">
          {filteredKeywords.length > 0 ? filteredKeywords.map(renderKeywordCard) : (
            <div className="rounded-[24px] border border-dashed border-[#d9cfbf] bg-white p-8 text-center text-slate-600">
              No keywords match this view.
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-slate-500">Showing up to 30 keywords. Use search, status, or cluster filters to narrow the list.</p>
      </section>

      <section className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] shadow-sm">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">Manual tools</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#0f172a]">Add or import keywords manually</h2>
            </div>
            <span className="rounded-full border border-[#d9cfbf] bg-white px-4 py-2 text-sm font-semibold text-slate-700"><span className="group-open:hidden">Open</span><span className="hidden group-open:inline">Close</span></span>
          </summary>
          <div className="space-y-6 border-t border-[#e7dfd2] px-6 pb-6 pt-6">
            <form onSubmit={addKeyword} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <input className={inputClass} placeholder="Enter a keyword" value={form.keyword} onChange={(e) => setForm((prev) => ({ ...prev, keyword: e.target.value }))} />
              <select className={selectClass} value={form.cluster} onChange={(e) => setForm((prev) => ({ ...prev, cluster: e.target.value }))}>
                <option value="student-success">Student Success</option>
                <option value="exam-prep">Exam Prep</option>
                <option value="academic-writing">Academic Writing</option>
                <option value="teaching-strategies">Teaching Strategies</option>
                <option value="special-education">Special Education</option>
                <option value="parent-guides">Parent Guides</option>
                <option value="homeschooling">Homeschooling</option>
                <option value="edtech">EdTech</option>
              </select>
              <select className={selectClass} value={form.audience} onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="parents">Parents</option>
                <option value="general">General</option>
              </select>
              <select className={selectClass} value={form.search_intent} onChange={(e) => setForm((prev) => ({ ...prev, search_intent: e.target.value }))}>
                <option value="informational">Informational</option>
                <option value="comparison">Comparison</option>
                <option value="how-to">How-to</option>
              </select>
              <input className={inputClass} type="number" min={1} max={100} value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: Number(e.target.value || 0) }))} />
              <button disabled={submitting} className="rounded-2xl bg-[#0f1b3d] px-5 py-3 font-semibold text-white disabled:opacity-60">{submitting ? 'Saving...' : 'Add approved keyword'}</button>
            </form>

            <details className="rounded-[24px] border border-[#e2d9cb] bg-white">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-800">Bulk import</summary>
              <div className="border-t border-[#e7dfd2] p-5">
                <textarea className="min-h-[180px] w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-sm leading-7 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f1b3d]/10" placeholder={`how to study effectively, student-success, students, informational, 80, US\nbest note taking methods, student-success, students, informational, 70, US`} value={bulkRaw} onChange={(e) => setBulkRaw(e.target.value)} />
                <button type="button" onClick={importKeywords} disabled={importing} className="mt-4 rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-[#fffdfa] disabled:opacity-60">{importing ? 'Importing...' : 'Import keywords'}</button>
              </div>
            </details>
          </div>
        </details>
      </section>
    </div>
  );
}
