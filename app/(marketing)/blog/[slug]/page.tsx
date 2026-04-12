import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { NewsletterForm } from '@/components/newsletter-form';
import { ArticleEnhancements } from '@/components/article-enhancements';
import {
  getPostBySlug,
  getRelatedPostsBySlug,
  getStructuredDataForPost
} from '@/lib/data';
import { getSiteUrl } from '@/lib/utils';

function stripNofollowFromHtml(html: string) {
  return html.replace(/\srel=(["'])(.*?)\1/gi, (_match, quote, value) => {
    const cleaned = String(value)
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token.toLowerCase() !== 'nofollow');

    return cleaned.length ? ` rel=${quote}${cleaned.join(' ')}${quote}` : '';
  });
}

function cleanArticleHtml(html: string) {
  return stripNofollowFromHtml(html)
    .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/<h2>(?:\s|&nbsp;|<br\s*\/?>)*<\/h2>/gi, '')
    .replace(/<h3>(?:\s|&nbsp;|<br\s*\/?>)*<\/h3>/gi, '')
    .replace(/^(?:\s|&nbsp;|<br\s*\/?>)+/gi, '')
    .trim();
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const normalizedSlug = decodeURIComponent(slug)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

  const post = await getPostBySlug(normalizedSlug);
  if (!post) return {};

  const url = `${getSiteUrl()}/blog/${normalizedSlug}`;

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    keywords: post.keywords || undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      url,
      type: 'article',
      images: post.featured_image_url ? [{ url: post.featured_image_url }] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt
    }
  };
}

export default async function PostPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const normalizedSlug = decodeURIComponent(slug)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

  const [post, structuredData, relatedPosts] = await Promise.all([
    getPostBySlug(normalizedSlug),
    getStructuredDataForPost(normalizedSlug),
    getRelatedPostsBySlug(normalizedSlug, 3)
  ]);

  if (!post) notFound();

  const cleanedContent = cleanArticleHtml(post.content);
  const articleUrl = `${getSiteUrl()}/blog/${normalizedSlug}`;

  return (
    <article className="container-shell article-page dark pt-12 pb-6 sm:pt-14 sm:pb-8">
      <ArticleEnhancements title={post.title} url={articleUrl} />

      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="article-main">
          <div className="paper article-shell overflow-hidden">
            <div className="article-hero">
              <div className="relative aspect-[16/8] overflow-hidden bg-[linear-gradient(135deg,#f3ead9,#dbc298)]">
                {post.featured_image_url ? (
                  <Image
                    src={post.featured_image_url}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-end p-10">
                    <p className="display-font text-5xl font-semibold text-slate-900/80">
                      {post.title}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-12">
              <div className="article-meta-row mb-6 flex flex-wrap items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                <span className="text-brand-700">
                  {post.categories?.name || 'Education'}
                </span>
                {post.published_at ? (
                  <span>{format(new Date(post.published_at), 'MMMM d, yyyy')}</span>
                ) : null}
                <span>{post.reading_time_minutes} min read</span>
              </div>

              <h1 className="display-font article-title text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>

              <p className="article-dek mt-5 max-w-3xl text-xl leading-9 text-slate-600">
                {post.excerpt}
              </p>

              <Link
                href={`/authors/${post.author?.slug ?? ''}`}
                className="article-author-card mt-8 mb-8 block rounded-[28px] border border-slate-200 bg-stone-50 p-5 transition duration-200 hover:-translate-y-[1px] hover:border-slate-300"
              >
                <div className="flex items-start gap-4">
                  <div className="article-author-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                    {post.author?.avatarInitials ?? 'NJ'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                      Contributor
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {post.author_name}
                    </h2>
                    {post.author_bio ? (
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {post.author_bio}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Read more from this contributor in the Northfield Journal.
                      </p>
                    )}

                    <span className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700">
                      View contributor page →
                    </span>
                  </div>
                </div>
              </Link>

              <div
                className="journal-prose prose prose-lg max-w-none
prose-p:my-5 prose-p:leading-9
prose-headings:tracking-tight
prose-h2:mb-5 prose-h2:mt-12 prose-h2:text-3xl prose-h2:font-semibold
prose-h3:mb-4 prose-h3:mt-8 prose-h3:text-2xl prose-h3:font-semibold
prose-ul:my-6 prose-ol:my-6 prose-li:my-1
prose-blockquote:my-7 prose-blockquote:border-l-4 prose-blockquote:pl-5
prose-a:text-brand-700 prose-a:underline
prose-strong:text-slate-900

dark:prose-p:text-slate-200
dark:prose-li:text-slate-200
dark:prose-strong:text-white
dark:prose-headings:text-white
dark:prose-a:text-amber-400

[&>*:first-child]:mt-0
[&>*:last-child]:mb-0

[&>p:first-of-type]:text-[1.18rem]
[&>p:first-of-type]:leading-9

[&>p:first-of-type:first-letter]:float-left
[&>p:first-of-type:first-letter]:mr-3
[&>p:first-of-type:first-letter]:mt-2
[&>p:first-of-type:first-letter]:font-serif
[&>p:first-of-type:first-letter]:text-6xl
[&>p:first-of-type:first-letter]:font-semibold
[&>p:first-of-type:first-letter]:leading-[0.8]
[&>p:first-of-type:first-letter]:text-slate-900

dark:[&>p:first-of-type:first-letter]:text-white
"
                dangerouslySetInnerHTML={{
                  __html: cleanedContent
                }}
              />

              {relatedPosts.length ? (
                <section className="article-related mt-8 border-t border-slate-200 pt-8">
                  <div className="section-header-row">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                      Related reading
                    </p>
                    <h2 className="display-font mt-3 text-3xl font-semibold text-slate-900">
                      More from Northfield Journal
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                      Articles selected for readers who want to keep following this theme,
                      contributor, or editorial thread.
                    </p>
                  </div>

                  <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {relatedPosts.map((relatedPost) => (
                      <Link
                        key={relatedPost.id}
                        href={`/blog/${relatedPost.slug}`}
                        className="paper related-story-card group overflow-hidden"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(135deg,#f3ead9,#dbc298)]">
                          {relatedPost.featured_image_url ? (
                            <Image
                              src={relatedPost.featured_image_url}
                              alt={relatedPost.title}
                              fill
                              className="object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-end p-6">
                              <p className="display-font text-2xl font-semibold text-slate-900/85">
                                {relatedPost.title}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            <span className="text-brand-700">
                              {relatedPost.categories?.name || 'Journal'}
                            </span>
                            {relatedPost.published_at ? (
                              <span>
                                {format(
                                  new Date(relatedPost.published_at),
                                  'MMM d, yyyy'
                                )}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-xl font-semibold leading-snug text-slate-900 transition group-hover:text-brand-700">
                            {relatedPost.title}
                          </h3>

                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">
                            {relatedPost.excerpt}
                          </p>

                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                            <span className="text-sm text-slate-600">
                              By {relatedPost.author_name}
                            </span>
                            <span className="text-sm font-semibold text-brand-700">
                              Read article →
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="article-end-cta mt-10 border-t border-slate-200 pt-6">
                <p className="text-sm uppercase tracking-[0.18em] text-brand-700">
                  Continue the conversation
                </p>
                <h2 className="display-font mt-4 text-3xl font-semibold text-slate-900">
                  Enjoyed this article?
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                  Share your perspective with Northfield Journal. We welcome clear,
                  practical, and thoughtful writing from educators, tutors, researchers,
                  and contributors.
                </p>
                <div className="mt-6">
                  <Link
                    href="/guest-post"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
                  >
                    Contribute to the journal →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <NewsletterForm />

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              About this article
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This piece is designed to be clear, practical, and worth revisiting.
            </p>
          </div>

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              Contributor
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Written by {post.author_name}
              {post.author_bio ? ` — ${post.author_bio}` : '.'}
            </p>
            <Link
              href={`/authors/${post.author?.slug ?? ''}`}
              className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              Visit contributor page →
            </Link>
          </div>

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              For readers
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Save ideas that matter, share them with your team, and return when you
              need a sharper perspective.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}