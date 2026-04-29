'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  postId: string
  slug: string
  status: string
}

export function PostTableActions({ postId, slug, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function publishPost() {
    setLoading(true)

    await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    })

    router.refresh()
    setLoading(false)
  }

  async function deletePost() {
    const confirmed = window.confirm('Delete this post? This cannot be undone.')
    if (!confirmed) return

    setLoading(true)

    await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
    })

    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/admin/posts/${postId}/edit`}
        className="rounded-full border border-[#d8cdbb] px-4 py-2 text-center text-sm font-semibold text-slate-700"
      >
        Edit
      </Link>

      {status === 'published' ? (
        <Link
          href={`/blog/${slug}`}
          className="rounded-full border border-[#d8cdbb] px-4 py-2 text-center text-sm font-semibold text-slate-700"
        >
          View
        </Link>
      ) : (
        <Link
          href={`/admin/posts/${postId}/preview`}
          className="rounded-full border border-[#d8cdbb] px-4 py-2 text-center text-sm font-semibold text-slate-700"
        >
          Preview
        </Link>
      )}

      {status !== 'published' && (
        <button
          type="button"
          onClick={publishPost}
          disabled={loading}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Working...' : 'Publish'}
        </button>
      )}

      <button
        type="button"
        onClick={deletePost}
        disabled={loading}
        className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  )
}