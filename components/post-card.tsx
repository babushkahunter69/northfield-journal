import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Post } from '@/lib/types';

type PostCardProps = {
  post: Post;
  variant?: 'default' | 'featured';
};

function authorLabel(post: Post) {
  return post.author?.name || post.author_name || 'Northfield Journal Contributor';
}

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  if (variant === 'featured') {
    return (
      <article className="paper group overflow-hidden transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
          <Link href={`/blog/${post.slug}`} className="block">
            <div className="relative aspect-[16/10] h-full overflow-hidden bg-[linear-gradient(135deg,#f7ead0,#dec399)] lg:aspect-auto lg:min-h-[420px]">
              {post.featured_image_url ? (
                <Image
                  src={post.featured_image_url}
                  alt={post.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 flex items-end bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_50%)] p-8">
                  <p className="display-font text-4xl font-semibold leading-tight text-slate-900/85">
                    {post.title}
                  </p>
                </div>
              )}
            </div>
          </Link>

          <div className="flex flex-col justify-center p-7 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span className="text-brand-700">{post.categories?.name || 'Education'}</span>
              {post.published_at ? (
                <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
              ) : null}
              <span>{post.reading_time_minutes} min read</span>
            </div>

            <Link href={`/blog/${post.slug}`} className="block">
              <h3 className="display-font text-[2.4rem] font-semibold tracking-tight leading-[1.08] text-slate-900 transition group-hover:text-brand-800 sm:text-[2.75rem]">
                {post.title}
              </h3>
              <p className="mt-4 max-w-xl text-[16px] leading-8 text-slate-600">
                {post.excerpt}
              </p>
            </Link>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200/70 pt-5">
              <p className="text-sm text-slate-500">By {authorLabel(post)}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition hover:text-brand-900"
              >
                Read feature
                <span className="transition group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="paper group h-full overflow-hidden transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_26px_80px_rgba(15,23,42,0.12)]">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,#f7ead0,#dec399)]">
          {post.featured_image_url ? (
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-end bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_50%)] p-6">
              <p className="display-font text-2xl font-semibold leading-tight text-slate-900/85">
                {post.title}
              </p>
            </div>
          )}
        </div>
      </Link>

      <div className="p-7">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span className="text-brand-700">{post.categories?.name || 'Education'}</span>
          {post.published_at ? (
            <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
          ) : null}
          <span>{post.reading_time_minutes} min read</span>
        </div>

        <Link href={`/blog/${post.slug}`} className="block">
          <h3 className="display-font text-[1.9rem] font-semibold tracking-tight leading-[1.15] text-slate-900 transition group-hover:text-brand-800">
            {post.title}
          </h3>

          <p className="mt-3 text-[15px] leading-7 text-slate-600">
            {post.excerpt}
          </p>
        </Link>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200/70 pt-4">
          <p className="text-sm text-slate-500">By {authorLabel(post)}</p>

          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition hover:text-brand-900"
          >
            Read article
            <span className="transition group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
