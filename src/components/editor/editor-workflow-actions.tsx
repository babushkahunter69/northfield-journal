'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Action =
  | 'assign'
  | 'under_review'
  | 'needs_revision'
  | 'reject'
  | 'publish'

export function EditorWorkflowActions({ articleId }: { articleId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<Action | null>(null)

  async function runAction(action: Action) {
    setLoading(action)

    try {
      const res = await fetch(`/api/articles/${articleId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Unable to update article workflow')
        return
      }

      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => runAction('assign')}
        disabled={loading !== null}
        className="rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading === 'assign' ? 'Assigning...' : 'Assign to me'}
      </button>

      <button
        type="button"
        onClick={() => runAction('under_review')}
        disabled={loading !== null}
        className="rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading === 'under_review' ? 'Updating...' : 'Mark under review'}
      </button>

      <button
        type="button"
        onClick={() => runAction('needs_revision')}
        disabled={loading !== null}
        className="rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading === 'needs_revision' ? 'Updating...' : 'Request revision'}
      </button>

      <button
        type="button"
        onClick={() => runAction('reject')}
        disabled={loading !== null}
        className="rounded-full border px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
      >
        {loading === 'reject' ? 'Rejecting...' : 'Reject'}
      </button>

      <button
        type="button"
        onClick={() => runAction('publish')}
        disabled={loading !== null}
        className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading === 'publish' ? 'Publishing...' : 'Publish'}
      </button>
    </div>
  )
}