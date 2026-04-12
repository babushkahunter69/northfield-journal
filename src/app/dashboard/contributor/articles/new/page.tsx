'use client'

import { useRouter } from 'next/navigation'
import { ArticleForm } from '@/components/forms/article-form'

export default function NewArticlePage() {
  const router = useRouter()

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-semibold">New Submission</h1>

      <ArticleForm
        onSubmit={async (payload) => {
          const res = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          const data = await res.json()

          if (!res.ok) {
            throw new Error(data.error || 'Failed to save article')
          }

          router.push(`/dashboard/contributor/articles/${data.article.id}/edit`)
        }}
      />
    </main>
  )
}