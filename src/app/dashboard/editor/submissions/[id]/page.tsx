import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/editor/status-badge'
import { EditorWorkflowActions } from '@/components/editor/editor-workflow-actions'
import { EditorNoteForm } from '@/components/editor/editor-note-form'

type ReviewNote = {
  id: string
  body: string
  internal: boolean
  created_at: string
  author: { name: string | null }[] | null
}

type RevisionRow = {
  id: string
  title: string
  status: string
  created_at: string
  updated_by_profile: { name: string | null }[] | null
}

export default async function EditorSubmissionReviewPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['editor', 'admin'].includes(profile.role)) {
    redirect('/')
  }

  const { data: article } = await supabase
    .from('articles')
    .select(`
      *,
      author:profiles!articles_author_id_fkey(
        id,
        name,
        slug,
        bio,
        email
      ),
      editor:profiles!articles_editor_id_fkey(
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (!article) notFound()

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

  const { data: revisions } = await supabase
    .from('article_revisions')
    .select(`
      id,
      title,
      status,
      created_at,
      updated_by_profile:profiles!article_revisions_updated_by_fkey(name)
    `)
    .eq('article_id', id)
    .order('created_at', { ascending: false })

  const reviewNotes = (notes || []) as ReviewNote[]
  const revisionRows = (revisions || []) as RevisionRow[]

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3">
            <Link href="/dashboard/editor" className="text-sm underline">
              Back to editorial queue
            </Link>
          </div>

          <h1 className="text-3xl font-semibold">{article.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <span>By {article.author?.name || 'Unknown author'}</span>
            <span>·</span>
            <StatusBadge status={article.status} />
            {article.editor?.name ? (
              <>
                <span>·</span>
                <span>Editor: {article.editor.name}</span>
              </>
            ) : null}
          </div>
        </div>

        <EditorWorkflowActions articleId={article.id} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-8">
          <article className="rounded-3xl border px-6 py-8 md:px-10">
            {article.excerpt ? (
              <p className="mb-8 text-lg leading-8 text-neutral-600">
                {article.excerpt}
              </p>
            ) : null}

            <div className="prose prose-lg prose-neutral max-w-none whitespace-pre-wrap">
              {article.content}
            </div>
          </article>

          <div className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">Revision history</h2>

            <div className="mt-4 space-y-3">
              {revisionRows.length ? (
                revisionRows.map((revision) => (
                  <div key={revision.id} className="rounded-xl bg-neutral-50 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{revision.title}</span>
                      <span className="text-neutral-400">·</span>
                      <span className="capitalize text-neutral-600">
                        {revision.status.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-neutral-500">
                      {revision.updated_by_profile?.[0]?.name || 'Unknown'} ·{' '}
                      {new Date(revision.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-600">No revisions yet.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Submission details
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Category</dt>
                <dd className="mt-1 text-neutral-900">
                  {article.category || 'Uncategorized'}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Tags</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {article.tags?.length ? (
                    article.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full border px-2 py-1 text-xs">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-600">No tags</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">SEO title</dt>
                <dd className="mt-1 text-neutral-900">
                  {article.seo_title || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">SEO description</dt>
                <dd className="mt-1 text-neutral-900">
                  {article.seo_description || 'Not set'}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Author</dt>
                <dd className="mt-1 text-neutral-900">
                  {article.author?.name || 'Unknown'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Add editorial note
            </h2>

            <div className="mt-4">
              <EditorNoteForm articleId={article.id} />
            </div>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Notes
            </h2>

            <div className="mt-4 space-y-4">
              {reviewNotes.length ? (
                reviewNotes.map((note) => (
                  <div key={note.id} className="rounded-xl bg-neutral-50 p-4">
                    <p className="text-sm text-neutral-800">{note.body}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span>{note.author?.[0]?.name || 'Editor'}</span>
                      <span>·</span>
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                      {note.internal ? (
                        <>
                          <span>·</span>
                          <span>Internal</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-600">No notes yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}