'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showAdminToast } from '@/lib/admin/toast';

type QueueRow = {
  id: string;
  keyword: string;
  cluster: string | null;
  priority: number;
  status: 'queued' | 'in_progress' | 'done' | 'skipped';
  last_generated_at: string | null;
};

function statusPillClass(status: QueueRow['status']) {
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

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function QueueTable({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [runningCron, setRunningCron] = useState(false);

  async function generate(keywordId: string) {
    setLoadingId(keywordId);

    try {
      const response = await fetch('/api/admin/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword_id: keywordId })
      });

      const data = await safeJson(response);

      if (!response.ok) {
        const message =
          data?.error ||
          `Draft generation failed with status ${response.status}.`;
        showAdminToast({ type: 'error', title: 'Draft generation failed', description: message });
        return;
      }

      if (!data?.post?.id) {
        showAdminToast({ type: 'error', title: 'Draft generation incomplete', description: 'Draft was created but no post ID was returned.' });
        return;
      }

      showAdminToast({ type: 'success', title: 'Draft generated', description: 'Opening the new draft in the editor.' });
      router.push(`/admin/posts/${data.post.id}/edit`);
    } catch (error) {
      showAdminToast({ type: 'error', title: 'Draft generation failed', description: error instanceof Error ? error.message : 'Draft generation failed.' });
    } finally {
      setLoadingId(null);
    }
  }

  async function runDailyCronNow() {
    setRunningCron(true);

    try {
      const response = await fetch('/api/admin/run-daily-cron', {
        method: 'POST'
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Cron failed', description: data?.error || 'Daily cron failed.' });
        return;
      }

      if (data?.data?.post?.id) {
        showAdminToast({ type: 'success', title: 'Draft generated', description: 'Opening the draft created by the cron job.' });
        router.push(`/admin/posts/${data.data.post.id}/edit`);
        return;
      }

      showAdminToast({ type: 'success', title: 'Cron finished', description: data?.data?.message || 'Cron ran successfully.' });
      router.refresh();
    } catch (error) {
      showAdminToast({ type: 'error', title: 'Cron failed', description: error instanceof Error ? error.message : 'Daily cron failed.' });
    } finally {
      setRunningCron(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">
            Automation
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-[#0f172a]">
            Draft Queue
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
            Run one-click generation for any queued topic, or trigger the same daily cron flow
            used by your deployment.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={runDailyCronNow}
            disabled={runningCron}
            className="rounded-2xl bg-[#0f1b3d] px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {runningCron ? 'Running cron...' : 'Run daily cron now'}
          </button>

          <Link
            href="/admin/keywords"
            className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
          >
            Manage keywords
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-[#e7dfd2] bg-[#f8f3ea] text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-6 py-5">Keyword</th>
                <th className="px-6 py-5">Cluster</th>
                <th className="px-6 py-5">Priority</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Last generated</th>
                <th className="px-6 py-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#efe7da] last:border-b-0">
                  <td className="px-6 py-4 text-sm font-medium text-[#0f172a]">{row.keyword}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.cluster || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.priority}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {row.last_generated_at ? new Date(row.last_generated_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => generate(row.id)}
                      disabled={loadingId === row.id || row.status === 'in_progress'}
                      className="rounded-full border border-[#d9cfbf] bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-[#fffdfa] disabled:opacity-60"
                    >
                      {loadingId === row.id ? 'Generating...' : 'Generate draft'}
                    </button>
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