import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { AdSenseSlot } from '@/components/adsense-slot';
import { NewsletterForm } from '@/components/newsletter-form';
import { MarkdownPreview } from '@/components/markdown-preview';
import { getPostBySlug, getStructuredDataForPost } from '@/lib/data';
import { getSiteUrl } from '@/lib/utils';

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
      images: post.featured_image_url
        ? [{ url: post.featured_image_url }]
        : undefined
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

  const [post, structuredData] = await Promise.all([
    getPostBySlug(normalizedSlug),
    getStructuredDataForPost(normalizedSlug)
  ]);

  if (!post) notFound();

  return (
    <article className="container-shell py-14">
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="paper overflow-hidden">
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

          <div className="p-6 sm:p-10">
            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              <span>{post.categories?.name || 'Education'}</span>
              {post.published_at ? (
                <span>{format(new Date(post.published_at), 'MMMM d, yyyy')}</span>
              ) : null}
              <span>{post.reading_time_minutes} min read</span>
            </div>

            <h1 className="display-font text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            <p className="mt-5 max-w-3xl text-xl leading-9 text-slate-600">
              {post.excerpt}
            </p>

            <div className="mt-8 rounded-[24px] border border-slate-200 bg-stone-50 px-5 py-5 text-sm leading-7 text-slate-600">
              <strong className="text-slate-900">By {post.author_name}</strong>
              {post.author_bio ? <span> — {post.author_bio}</span> : null}
            </div>

            <div className="my-8">
              <AdSenseSlot className="min-h-[120px]" />
            </div>

            <MarkdownPreview content={post.content} />

            <div className="mt-12 border-t border-slate-200 pt-8">
              <Link
                href="/guest-post"
                className="text-sm font-semibold text-brand-700 hover:text-brand-900"
              >
                Enjoyed this article? Contribute to the journal →
              </Link>
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
              This article was written to be clear, practical, and useful for readers.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}