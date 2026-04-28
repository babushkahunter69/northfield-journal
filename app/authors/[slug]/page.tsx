import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getAuthorBySlug, getPostsByAuthorSlug } from '@/lib/data';
import { getSiteUrl } from '@/lib/utils';

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);

  if (!author) return {};

  const title = `${author.name} | Northfield Journal`;
  const description =
    author.bio ||
    `Read articles and commentary by ${author.name} in the Northfield Journal.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${getSiteUrl()}/authors/${author.slug}`
    },
    openGraph: {
      title,
      description,
      url: `${getSiteUrl()}/authors/${author.slug}`,
      type: 'profile'
    },
    twitter: {
      card: 'summary',
      title,
      description
    }
  };
}

export default async function AuthorPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [author, posts] = await Promise.all([
    getAuthorBySlug(slug),
    getPostsByAuthorSlug(slug)
  ]);

  if (!author) notFound();

  return (
    <main className="container-shell py-12 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <section className="paper premium-panel overflow-hidden rounded-[32px] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[120px_minmax(0,1fr)] lg:items-start">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-stone-50 text-lg font-semibold uppercase tracking-[0.2em] text-slate-900 sm:h-28 sm:w-28">
              {author.avatarInitials}
            </div>

            <div>
              <p className="eyebrow">Contributor</p>
              <h1 className="display-font mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                {author.name}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3 text-sm uppercase tracking-[0.16em] text-slate-500">
                <span>{author.articleCount ?? posts.length} articles</span>
                {author.latestPublishedAt ? (
                  <span>
                    Latest:{' '}
                    {format(new Date(author.latestPublishedAt), 'MMMM d, yyyy')}
                  </span>
                ) : null}
              </div>

              <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-600">
                {author.bio ||
                  `${author.name} contributes thoughtful, practical writing to the Northfield Journal.`}
              </p>

              <div className="mt-6">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
                >
                  ← Back to the journal
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="section-header-row">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              Published work
            </p>
            <h2 className="display-font mt-3 text-3xl font-semibold text-slate-900">
              Articles by {author.name}
            </h2>
          </div>

          {posts.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="paper group rounded-[24px] p-6 transition duration-200 hover:-translate-y-[2px]"
                >
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span className="text-brand-700">
                      {post.categories?.name || 'Journal'}
                    </span>
                    {post.published_at ? (
                      <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-2xl font-semibold leading-snug text-slate-900 transition group-hover:text-brand-700">
                    {post.title}
                  </h3>

                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
                    {post.excerpt}
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <span className="text-sm text-slate-600">
                      {post.reading_time_minutes} min read
                    </span>
                    <span className="text-sm font-semibold text-brand-700">
                      Read article →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="paper mt-8 rounded-[24px] p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">No articles yet</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                New articles from this contributor will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
