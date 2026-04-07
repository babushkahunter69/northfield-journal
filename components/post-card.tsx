import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Post } from '@/lib/types';

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="paper group h-full overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,#f3ead9,#dbc298)] dark:bg-[linear-gradient(135deg,#2a241c,#5e4727)]">
          {post.featured_image_url ? (
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-end p-6">
              <p className="display-font text-3xl font-semibold text-slate-900/80 dark:text-white/80">{post.title}</p>
            </div>
          )}
        </div>
      </Link>

      <div className="p-7">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <span>{post.categories?.name || 'Education'}</span>
          {post.published_at ? <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span> : null}
          <span>{post.reading_time_minutes} min read</span>
        </div>

        <Link href={`/blog/${post.slug}`} className="block">
          <h3 className="display-font text-3xl font-semibold tracking-tight text-slate-900 transition group-hover:text-brand-800 dark:text-white dark:group-hover:text-brand-300">
            {post.title}
          </h3>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">{post.excerpt}</p>
        </Link>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">By {post.author_name}</p>
          <Link href={`/blog/${post.slug}`} className="text-sm font-semibold text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-200">
            Read story →
          </Link>
        </div>
      </div>
    </article>
  );
}
