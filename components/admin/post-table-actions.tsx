'use client';

import Link from 'next/link';

type Props = {
  postId: string;
  slug: string;
  status: string;
};

export function PostTableActions({ postId, slug, status }: Props) {
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
        <form action={`/api/posts/${postId}/publish`} method="POST">
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Publish
          </button>
        </form>
      )}

      <form action={`/api/posts/${postId}/delete`} method="POST">
        <button
          type="submit"
          className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600"
        >
          Delete
        </button>
      </form>
    </div>
  );
}