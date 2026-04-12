'use client'

import { useState } from 'react'

type Props = {
  initialValues?: {
    title?: string
    excerpt?: string
    content?: string
    category?: string
    cover_image_url?: string
    seo_title?: string
    seo_description?: string
    canonical_url?: string
    og_image_url?: string
    tags?: string[]
  }
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}

export function ArticleForm({ initialValues, onSubmit }: Props) {
  const [form, setForm] = useState({
    title: initialValues?.title || '',
    excerpt: initialValues?.excerpt || '',
    content: initialValues?.content || '',
    category: initialValues?.category || '',
    cover_image_url: initialValues?.cover_image_url || '',
    seo_title: initialValues?.seo_title || '',
    seo_description: initialValues?.seo_description || '',
    canonical_url: initialValues?.canonical_url || '',
    og_image_url: initialValues?.og_image_url || '',
    tags: initialValues?.tags || [],
  })

  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function addTag() {
    const value = tagInput.trim()
    if (!value) return
    if (form.tags.includes(value)) {
      setTagInput('')
      return
    }

    setForm({ ...form, tags: [...form.tags, value] })
    setTagInput('')
  }

  function removeTag(tagToRemove: string) {
    setForm({
      ...form,
      tags: form.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        className="w-full rounded-xl border px-4 py-3"
        placeholder="Article title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <textarea
        className="min-h-28 w-full rounded-xl border px-4 py-3"
        placeholder="Excerpt"
        value={form.excerpt}
        onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
      />

      <textarea
        className="min-h-[420px] w-full rounded-2xl border px-4 py-3 font-serif"
        placeholder="Write your article..."
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="rounded-xl border px-4 py-3"
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <input
          className="rounded-xl border px-4 py-3"
          placeholder="Cover image URL"
          value={form.cover_image_url}
          onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
        />
      </div>

      <div className="rounded-2xl border p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          SEO
        </h3>

        <div className="grid gap-4">
          <input
            className="rounded-xl border px-4 py-3"
            placeholder="SEO title"
            value={form.seo_title}
            onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
          />

          <textarea
            className="min-h-24 rounded-xl border px-4 py-3"
            placeholder="SEO description"
            value={form.seo_description}
            onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="Canonical URL"
            value={form.canonical_url}
            onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="OG image URL"
            value={form.og_image_url}
            onChange={(e) => setForm({ ...form, og_image_url: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="mb-2 text-sm font-medium">Tags</div>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border px-4 py-3"
            placeholder="Add a tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
          />
          <button
            type="button"
            className="rounded-xl border px-4 py-3"
            onClick={addTag}
          >
            Add
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {form.tags.map((tag) => (
            <button
              type="button"
              key={tag}
              className="rounded-full border px-3 py-1 text-sm"
              onClick={() => removeTag(tag)}
              title="Remove tag"
            >
              {tag} ×
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        disabled={loading}
        className="rounded-full border px-6 py-3 text-sm font-medium disabled:opacity-60"
      >
        {loading ? 'Saving...' : 'Save draft'}
      </button>
    </form>
  )
}