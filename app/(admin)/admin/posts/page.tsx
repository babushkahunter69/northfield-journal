import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DeletePostButton } from '@/components/admin/delete-post-button';

export const dynamic = 'force-dynamic';

type PostRow = {
  id: string;
  title: string;
  slug: string;
  author_name: string;
  status: 'draft' | 'published';
  published_at: string | null;
  updated_at: string | null;
  categories: { name: string }[] | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return '—';
  }
}

export default async function AdminPostsPage() {
  const postsResponse = await supabaseAdmin
    .from('posts')
    .select('id, title, slug, author_name, status, published_at, updated_at, categories(name)')
    .order('updated_at', { ascending: false });

  const posts = (postsResponse.data ?? []) as PostRow[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e0bb42]">
            Publishing
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-white">
            All Posts
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-white/60">
            Manage your articles, jump into edits quickly, and keep publishing
            simple.
          </p>
        </div>

        <Link
          href="/admin/posts/new"
          className="inline-flex items-center rounded-2xl bg-[#e0bb42] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:brightness-105"
        >
          + New Post
        </Link>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0d0d] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-white/10 bg-white/[0.02]">
              <tr className="text-xs uppercase tracking-[0.18em] text-white/45">
                <th className="px-6 py-5">Title</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Author</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Actions</th>
              </tr>
            </thead>

            <tbody>
              {posts.map((post) => {
                const categoryName = post.categories?.[0]?.name || '—';

                return (
                  <tr
                    key={post.id}
                    className="border-b border-white/10 last:border-b-0"
                  >
                    <td className="px-6 py-5">
                      <div className="max-w-[360px]">
                        <p className="truncate text-base font-medium text-white">
                          {post.title}
                        </p>
                        <p className="mt-1 truncate text-sm text-white/40">
                          /blog/{post.slug}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm text-white/65">
                      {categoryName}
                    </td>

                    <td className="px-6 py-5 text-sm text-white/65">
                      {post.author_name}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          post.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-white/10 text-white/65'
                        }`}
                      >
                        {post.status === 'published' ? 'Live' : 'Draft'}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm text-white/50">
                      {formatDate(post.published_at || post.updated_at)}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-white/55 transition hover:text-white"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/posts/${post.id}/edit`}
                          className="font-medium text-[#e0bb42] transition hover:text-[#f0ce64]"
                        >
                          Edit
                        </Link>
                        <DeletePostButton postId={post.id} compact />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!posts.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-white/45"
                  >
                    No posts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}