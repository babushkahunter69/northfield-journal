'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeletePostButton({
  postId,
  compact = false
}: {
  postId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this article? This cannot be undone.'
    );

    if (!confirmed) return;

    setLoading(true);

    const res = await fetch('/api/admin/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId })
    });

    setLoading(false);

    if (!res.ok) {
      alert('Delete failed.');
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className={
        compact
          ? 'text-sm font-medium text-red-400 transition hover:text-red-300 disabled:opacity-60'
          : 'rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60'
      }
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  );
}