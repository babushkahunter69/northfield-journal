'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  postId: string;
  slug: string;
  status: string;
};

export function PostTableActions({ postId, slug, status }: Props) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function publishPost() {
    if (publishing) return;

    setPublishing(true);

    try {
      const response = await fetch('/api/admin/publish-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const failed = Array.isArray(data?.failed) && data.failed.length
          ? `\n\n${data.failed.join('\n')}`
          : '';
        window.alert(`${data?.error || 'Publish failed.'}${failed}`);
        return;
      }

      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function deletePost() {
    if (deleting) return;

    const confirmed = window.confirm('Delete this post? This cannot be undone.');
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
        window.alert(data?.error || 'Delete failed.');
        return;
      }

      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/admin/posts/${postId}/edit`}
        className="rounded-full border border-[#d8cdbb] px-4 py-2 text-sm font-semibold text-slate-700 text-center"
      >
        Edit
      </Link>

      {status === 'published' ? (
        <Link
          href={`/blog/${slug}`}
          className="rounded-full border border-[#d8cdbb] px-4 py-2 text-sm font-semibold text-slate-700 text-center"
        >
          View
        </Link>
      ) : (
        <Link
          href={`/admin/posts/${postId}/preview`}
          className="rounded-full border border-[#d8cdbb] px-4 py-2 text-sm font-semibold text-slate-700 text-center"
        >
          Preview
        </Link>
      )}

      {status !== 'published' && (
        <button
          type="button"
          onClick={publishPost}
          disabled={publishing}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      )}

      <button
        type="button"
        onClick={deletePost}
        disabled={deleting}
        className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
