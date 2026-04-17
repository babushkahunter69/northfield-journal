'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showAdminToast } from '@/lib/admin/toast';

export function DeletePostButton({
  postId,
  compact = false,
  onDeleted
}: {
  postId: string;
  compact?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setLoading(true);

    const res = await fetch('/api/admin/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId })
    });

    setLoading(false);

    if (!res.ok) {
      showAdminToast({ type: 'error', title: 'Delete failed', description: 'The article could not be deleted.' });
      return;
    }

    setOpen(false);

    if (onDeleted) {
      onDeleted();
      return;
    }

    showAdminToast({ type: 'success', title: 'Article deleted', description: 'The article was removed successfully.' });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className={
          compact
            ? 'rounded-full border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60'
            : 'rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60'
        }
      >
        {loading ? 'Deleting...' : 'Delete'}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,23,42,0.42)] p-4">
          <div className="w-full max-w-md rounded-[28px] border border-[#e2d9cb] bg-[#fffdfa] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
              Confirm delete
            </p>

            <h3 className="mt-3 font-serif text-3xl font-semibold text-[#0f172a]">
              Delete this article?
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              This action cannot be undone. The post will be permanently removed
              from your CMS.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? 'Deleting...' : 'Delete article'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}