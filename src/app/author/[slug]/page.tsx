import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AuthorPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!author) notFound()

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('author_id', author.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold">{author.name}</h1>

      {author.bio ? (
        <p className="mt-4 max-w-2xl text-neutral-700">{author.bio}</p>
      ) : null}

      <div className="mt-10 space-y-6">
        {articles?.length ? (
          articles.map((article) => (
            <article key={article.id} className="border-b pb-6">
              <Link href={`/article/${article.slug}`} className="text-2xl font-medium">
                {article.title}
              </Link>
              {article.excerpt ? (
                <p className="mt-2 text-neutral-600">{article.excerpt}</p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="text-neutral-600">No published articles yet.</p>
        )}
      </div>
    </main>
  )
}