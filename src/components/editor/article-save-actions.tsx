'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArticleForm } from '@/components/forms/article-form'
import { SubmitForReviewButton } from '@/components/editor/submit-for-review-button'

type Props = {
  article: {
    id: string
    title: string
    excerpt: string | null
    content: string
    category: string | null
    cover_image_url: string | null
    seo_title: string | null
    seo_description: string | null
    canonical_url: string | null
    og_image_url: string | null
    tags: string[]
    status: string
  }
}

export function ArticleEditorShell({ article }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-6">
      <ArticleForm
        initialValues={{
          title: article.title,
          excerpt: article.excerpt || '',
          content: article.content,
          category: article.category || '',
          cover_image_url: article.cover_image_url || '',
          seo_title: article.seo_title || '',
          seo_description: article.seo_description || '',
          canonical_url: article.canonical_url || '',
          og_image_url: article.og_image_url || '',
          tags: article.tags || [],
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            const res = await fetch(`/api/articles/${article.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })

            const data = await res.json()

            if (!res.ok) {
              throw new Error(data.error || 'Failed to save article')
            }

            router.refresh()
          } finally {
            setSaving(false)
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-neutral-500">
          {saving ? 'Saving changes...' : 'You can keep editing before submission.'}
        </div>

        {(article.status === 'draft' || article.status === 'needs_revision') && (
          <SubmitForReviewButton articleId={article.id} />
        )}
      </div>
    </div>
  )
}