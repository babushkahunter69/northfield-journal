import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ContributorDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Contributor Dashboard</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Draft, submit, and track your articles.
          </p>
        </div>
        <Link
          href="/dashboard/contributor/articles/new"
          className="rounded-full border px-5 py-2 text-sm font-medium"
        >
          New Article
        </Link>
      </div>

      <div className="grid gap-4">
        {articles?.length ? (
          articles.map((article) => (
            <div key={article.id} className="rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-medium">{article.title}</h2>
                  <p className="mt-1 text-sm capitalize text-neutral-600">
                    {article.status.replaceAll('_', ' ')}
                  </p>
                </div>
                <Link
                  href={`/dashboard/contributor/articles/${article.id}/edit`}
                  className="text-sm underline"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border p-8 text-neutral-600">
            No articles yet. Start your first submission.
          </div>
        )}
      </div>
    </main>
  )
}