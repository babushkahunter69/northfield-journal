'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showAdminToast } from '@/lib/admin/toast';

type Props = {
  postId: string;
  slug: string;
  status: 'draft' | 'published';
};

export function PostTableActions({ postId, slug, status }: Props) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handlePublish() {
    setPublishing(true);

    try {
      const response = await fetch('/api/admin/publish-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Publish failed', description: data?.error || 'Failed to publish post.' });
        return;
      }

      setCurrentStatus('published');
      showAdminToast({ type: 'success', title: 'Article published', description: 'The article is now live.' });
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this post? This cannot be undone.'
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch('/api/admin/delete-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Delete failed', description: data?.error || 'Failed to delete post.' });
        return;
      }

      showAdminToast({ type: 'success', title: 'Article deleted', description: 'The article was removed from the admin list.' });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/admin/posts/${postId}/edit`}
        className="rounded-full border border-[#d9cfbf] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        Edit
      </Link>

      <Link
        href={`/blog/${slug}`}
        className="rounded-full border border-[#d9cfbf] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        View
      </Link>

      {currentStatus !== 'published' ? (
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}