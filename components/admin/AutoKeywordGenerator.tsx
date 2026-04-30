'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ResponseData = {
  success?: boolean;
  inserted?: number;
  skipped?: number;
  message?: string;
  error?: string;
  ideas?: Array<{ id?: string; keyword?: string; cluster?: string | null }>;
};

export default function AutoKeywordGenerator() {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [focus, setFocus] = useState('study skills, exam prep, classroom teaching');
  const [audience, setAudience] = useState('mixed');
  const [gradeBand, setGradeBand] = useState('mixed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ResponseData | null>(null);

  async function handleGenerate() {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/keywords/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, focus, audience, grade_band: gradeBand })
      });

      const data = (await response.json()) as ResponseData;

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed.');
      }

      setResult(data);
      router.push('/admin/keywords?generated=1');
      router.refresh();
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Generation failed.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white/70 p-6 shadow-sm">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Northfield keyword ideas
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
          Generate education keywords for review
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          New keyword ideas are sent to the Keywords page first. Approve the strongest topics before they can be drafted.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">How many</span>
          <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value) || 20)} className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Editorial focus</span>
          <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="exam prep, study skills, classroom teaching" className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Audience mix</span>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500">
            <option value="mixed">mixed</option>
            <option value="students">students</option>
            <option value="teachers">teachers</option>
            <option value="parents">parents</option>
            <option value="general">general</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Grade-band mix</span>
          <select value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500">
            <option value="mixed">mixed</option>
            <option value="elementary">elementary</option>
            <option value="middle-school">middle school</option>
            <option value="high-school">high school</option>
            <option value="college">college</option>
            <option value="adult">adult</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={handleGenerate} disabled={isSubmitting} className="rounded-full bg-[#0f2350] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#112a61] disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Generating...' : 'Generate and review'}
        </button>
      </div>

      {result?.error ? (
        <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 p-4">
          <h3 className="text-base font-semibold text-rose-700">Generation failed</h3>
          <p className="mt-2 text-sm text-rose-700">{result.error}</p>
        </div>
      ) : null}
    </section>
  );
}
