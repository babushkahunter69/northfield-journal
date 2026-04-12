import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type SubmissionRow = {
  id: string
  title: string
  status: string
  updated_at: string
  author: {
    id: string
    name: string | null
    slug: string | null
  } | null
}

export default async function EditorDashboardPage() {
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

  const { data: submissions } = await supabase
    .from('articles')
    .select(
      `
      id,
      title,
      status,
      updated_at,
      author:profiles!articles_author_id_fkey(
        id,
        name,
        slug
      )
    `
    )
    .in('status', ['submitted', 'under_review', 'needs_revision'])
    .order('updated_at', { ascending: false })

  const rows = (submissions || []) as SubmissionRow[]

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-semibold">Editorial Queue</h1>

      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((article) => (
                <tr key={article.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/editor/submissions/${article.id}`}
                      className="underline"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{article.author?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 capitalize">
                    {article.status.replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(article.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-neutral-600">
                  No submissions in the queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}