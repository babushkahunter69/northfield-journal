'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function EditorNoteForm({ articleId }: { articleId: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(true)
  const [loading, setLoading] = useState(false)

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return

    setLoading(true)

    try {
      const res = await fetch('/api/editorial-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          body: body.trim(),
          internal,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Unable to add note')
        return
      }

      setBody('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submitNote} className="space-y-4">
      <textarea
        className="min-h-32 w-full rounded-xl border px-4 py-3"
        placeholder="Add editorial feedback, revision requests, or internal notes..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={internal}
          onChange={(e) => setInternal(e.target.checked)}
        />
        Internal note
      </label>

      <button
        disabled={loading}
        className="rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading ? 'Saving note...' : 'Add note'}
      </button>
    </form>
  )
}