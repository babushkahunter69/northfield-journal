'use client'

import { useRouter } from 'next/navigation'

export function SubmitForReviewButton({ articleId }: { articleId: string }) {
  const router = useRouter()

  return (
    <button
      className="rounded-full bg-black px-5 py-3 text-sm text-white"
      onClick={async () => {
        const res = await fetch(`/api/articles/${articleId}/submit`, {
          method: 'POST',
        })

        const data = await res.json()

        if (!res.ok) {
          alert(data.error || 'Unable to submit article')
          return
        }

        router.refresh()
      }}
    >
      Submit for review
    </button>
  )
}