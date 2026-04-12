import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/editor/status-badge'
import { ArticleEditorShell } from '@/components/editor/article-save-actions'

export default async function EditArticlePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (!article) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwner = article.author_id === user.id
  const isEditor = profile?.role === 'editor' || profile?.role === 'admin'

  if (!isOwner && !isEditor) redirect('/dashboard/contributor')

  const { data: notes } = await supabase
    .from('editorial_notes')
    .select(`
      id,
      body,
      internal,
      created_at,
      author:profiles(name)
    `)
    .eq('article_id', id)
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3">
            <Link href="/dashboard/contributor" className="text-sm underline">
              Back to dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-semibold">Edit Submission</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Refine your piece, tighten SEO, and submit when it’s ready.
          </p>
        </div>

        <StatusBadge status={article.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <ArticleEditorShell article={article} />
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Submission checklist
            </h2>

            <ul className="mt-4 space-y-3 text-sm text-neutral-700">
              <li>One clear title and angle</li>
              <li>Strong opening paragraph</li>
              <li>Meaningful subheads for long sections</li>
              <li>Excerpt written for search and sharing</li>
              <li>At least 2 internal links where relevant</li>
              <li>Credible external sources where needed</li>
            </ul>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Editorial notes
            </h2>

            <div className="mt-4 space-y-4">
              {notes?.length ? (
                notes
                  .filter((note) => !note.internal || isEditor)
                  .map((note) => (
                    <div key={note.id} className="rounded-xl bg-neutral-50 p-4">
                      <p className="text-sm text-neutral-800">{note.body}</p>
                      <p className="mt-2 text-xs text-neutral-500">
                        {note.author?.[0]?.name || 'Editor'} ·{' '}
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-neutral-600">
                  No editorial notes yet.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}