import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({
  params
}: {
  params: { id: string };
}) {
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('*, categories(name)')
    .eq('id', params.id)
    .maybeSingle();

  if (!post) notFound();

  const coverImage =
    post.featured_image_url ||
    post.cover_image ||
    post.cover_image_url ||
    post.image_url ||
    null;

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-[24px] border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">
            Draft Preview
          </p>
          <p className="mt-2 text-sm leading-6">
            This article is not visible to the public. Public blog links will return
            404 until the post is published.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/admin/posts/${post.id}/edit`}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Back to editor
            </Link>

            <Link
              href="/admin/posts"
              className="rounded-full border border-amber-300 bg-white px-5 py-2 text-sm font-semibold text-amber-900"
            >
              Back to posts
            </Link>
          </div>
        </div>

        <article className="overflow-hidden rounded-[32px] border border-[#e2d9cb] bg-[#fffdf8] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          {coverImage ? (
            <img
              src={coverImage}
              alt={post.title}
              className="h-auto w-full object-cover"
            />
          ) : (
            <div className="flex min-h-[260px] items-center justify-center bg-[#efe6d6] px-8 text-center">
              <p className="max-w-xl text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                No cover image added yet
              </p>
            </div>
          )}

          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mb-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span className="text-[#9a6730]">
                {post.categories?.name || 'Education'}
              </span>
              <span>{post.status === 'published' ? 'Published' : 'Draft'}</span>
            </div>

            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {post.title}
            </h1>

            {post.excerpt ? (
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {post.excerpt}
              </p>
            ) : null}

            <div
              className="prose prose-slate mt-10 max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />
          </div>
        </article>
      </div>
    </main>
  );
}