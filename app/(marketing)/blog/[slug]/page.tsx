import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { NewsletterForm } from '@/components/newsletter-form';
import { ArticleEnhancements } from '@/components/article-enhancements';
import { RichContent } from '@/components/rich-content';
import {
  getPostBySlug,
  getRelatedPostsBySlug,
  getStructuredDataForPost
} from '@/lib/data';
import { getSiteUrl } from '@/lib/utils';
import { getAutoAuthor } from '@/lib/seo-authors';


function absoluteUrl(value?: string | null) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  const siteUrl = getSiteUrl().replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteUrl}${path}`;
}

function getPostImageUrl(post: { featured_image_url?: string | null; og_image_url?: string | null }) {
  return absoluteUrl(post.featured_image_url) || absoluteUrl(post.og_image_url) || absoluteUrl('/opengraph-image');
}

function slugFromName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
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
  const imageUrl = getPostImageUrl(post);

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
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: post.title }] : undefined,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || post.published_at || undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: imageUrl ? [imageUrl] : undefined
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

  const articleUrl = `${getSiteUrl()}/blog/${normalizedSlug}`;
  const fallbackAuthor = getAutoAuthor(
    'northfield',
    [post.categories?.name, post.title].filter(Boolean).join(' ')
  );

  const displayAuthorName = post.author?.name || post.author_name || fallbackAuthor.name;
  const displayAuthorBio = post.author?.bio || post.author_bio || fallbackAuthor.bio;
  const displayAuthorInitials = post.author?.avatarInitials || fallbackAuthor.initials;
  const displayAuthorSlug = post.author?.slug || slugFromName(displayAuthorName);

  return (
    <article className="container-shell article-page pt-12 pb-6 sm:pt-14 sm:pb-8">
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

              <h1 className="display-font article-title text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
                {post.title}
              </h1>

              <p className="article-dek mt-5 max-w-3xl text-xl leading-9 text-slate-600 dark:text-slate-300">
                {post.excerpt}
              </p>

              <Link
                href={`/authors/${displayAuthorSlug}`}
                className="article-author-card mt-8 mb-8 block rounded-[28px] border border-slate-200 bg-stone-50 p-5 transition duration-200 hover:-translate-y-[1px] hover:border-slate-300"
              >
                <div className="flex items-start gap-4">
                  <div className="article-author-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-[0.18em] text-slate-900 dark:text-white">
                    {displayAuthorInitials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                      Contributor
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {displayAuthorName}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {displayAuthorBio}
                    </p>

                    <span className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700">
                      View contributor page →
                    </span>
                  </div>
                </div>
              </Link>

              <RichContent content={post.content} />

              <section className="mt-10 rounded-[28px] border border-slate-200 bg-stone-50 p-6 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                  Reviewed by
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {fallbackAuthor.reviewerName}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {fallbackAuthor.reviewerRole}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {fallbackAuthor.reviewerBio}
                </p>
              </section>

              {relatedPosts.length ? (
                <section className="article-related mt-8 border-t border-slate-200 pt-8 dark:border-slate-700">
                  <div className="section-header-row">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                      Related reading
                    </p>
                    <h2 className="display-font mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                      More from Northfield Journal
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
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

                          <h3 className="mt-3 text-xl font-semibold leading-snug text-slate-900 transition group-hover:text-brand-700 dark:text-white">
                            {relatedPost.title}
                          </h3>

                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {relatedPost.excerpt}
                          </p>

                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              By {relatedPost.author?.name || relatedPost.author_name}
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

              <div className="article-end-cta mt-10 border-t border-slate-200 pt-6 dark:border-slate-700">
                <p className="text-sm uppercase tracking-[0.18em] text-brand-700">
                  Continue the conversation
                </p>
                <h2 className="display-font mt-4 text-3xl font-semibold text-slate-900 dark:text-white">
                  Enjoyed this article?
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
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
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              This piece is designed to be clear, practical, and worth revisiting.
            </p>
          </div>

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              Contributor
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Written by {displayAuthorName}
              {displayAuthorBio ? ` — ${displayAuthorBio}` : '.'}
            </p>
            <Link
              href={`/authors/${displayAuthorSlug}`}
              className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              Visit contributor page →
            </Link>
          </div>

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              Reviewed by
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {fallbackAuthor.reviewerName} — {fallbackAuthor.reviewerBio}
            </p>
          </div>

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              For readers
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Save ideas that matter, share them with your team, and return when you
              need a sharper perspective.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}
