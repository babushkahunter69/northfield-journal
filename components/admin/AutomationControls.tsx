'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showAdminToast } from '@/lib/admin/toast';

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function AutomationControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [focus, setFocus] = useState('');
  const [count, setCount] = useState(20);

  async function runAction(name: string, url: string, body: Record<string, unknown> = {}) {
    setBusy(name);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data?.error || `${name} failed.`);
      }

      if (name === 'Generate Keywords') {
        showAdminToast({
          type: 'success',
          title: 'Keywords generated',
          description: data?.message || `${data?.inserted ?? 0} new keyword ideas are ready for review. Skipped ${data?.skipped ?? 0}.`
        });
        router.push('/admin/keywords?generated=1');
        router.refresh();
        return;
      }

      if (data?.post?.id) {
        showAdminToast({ type: 'success', title: name, description: 'Opening the generated draft.' });
        router.push(`/admin/posts/${data.post.id}/edit`);
        return;
      }

      const firstPost = data?.results?.find?.((item: any) => item?.success && item?.post?.id)?.post;
      if (firstPost?.id) {
        showAdminToast({ type: 'success', title: name, description: 'Opening the first generated draft.' });
        router.push(`/admin/posts/${firstPost.id}/edit`);
        return;
      }

      showAdminToast({
        type: 'success',
        title: name,
        description:
          data?.message ||
          `Inserted ${data?.inserted ?? 0}, skipped ${data?.skipped ?? 0}, processed ${data?.processed ?? 0}.`
      });
      router.refresh();
    } catch (error) {
      showAdminToast({
        type: 'error',
        title: `${name} failed`,
        description: error instanceof Error ? error.message : `${name} failed.`
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">Automation</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#0f172a]">Northfield Keyword to Draft Workflow</h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Generate education keyword ideas, review them, approve the strongest topics, then draft from the approved queue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_160px]">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Keyword focus</span>
          <input
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
            placeholder="Leave blank for automatic diverse education topics"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Count</span>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(event) => setCount(Number(event.target.value) || 20)}
            className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => runAction('Generate Keywords', '/api/admin/automation/keywords', { count, focus })} disabled={Boolean(busy)} className="rounded-2xl bg-[#0f1b3d] px-4 py-3 font-semibold text-white disabled:opacity-60">
          {busy === 'Generate Keywords' ? 'Generating...' : 'Generate Keywords'}
        </button>
        <button type="button" onClick={() => runAction('Draft Next', '/api/admin/automation/draft')} disabled={Boolean(busy)} className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-60">
          {busy === 'Draft Next' ? 'Drafting...' : 'Draft Next'}
        </button>
        <button type="button" onClick={() => runAction('Run Batch', '/api/admin/automation/run', { limit: 1, focus, refill_if_empty: true })} disabled={Boolean(busy)} className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-60">
          {busy === 'Run Batch' ? 'Running...' : 'Run Batch'}
        </button>
        <button type="button" onClick={() => runAction('Clean Duplicates', '/api/admin/automation/cleanup')} disabled={Boolean(busy)} className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-60">
          {busy === 'Clean Duplicates' ? 'Cleaning...' : 'Clean Duplicates'}
        </button>
      </div>
    </section>
  );
}
