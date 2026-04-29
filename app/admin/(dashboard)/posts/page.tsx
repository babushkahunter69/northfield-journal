import { supabaseAdmin } from '@/lib/supabase-admin';
import { PostTableActions } from '@/components/admin/post-table-actions';

export default async function AdminPostsPage() {
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  const totalPosts = posts?.length || 0;
  const publishedPosts =
    posts?.filter((post) => post.status === 'published').length || 0;
  const draftPosts =
    posts?.filter((post) => post.status === 'draft').length || 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#e2d9cb] bg-[#fffdf8] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Total posts
          </p>
          <p className="mt-4 text-5xl font-semibold text-slate-900">{totalPosts}</p>
        </div>

        <div className="rounded-[24px] border border-[#e2d9cb] bg-[#fffdf8] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Published
          </p>
          <p className="mt-4 text-5xl font-semibold text-slate-900">{publishedPosts}</p>
        </div>

        <div className="rounded-[24px] border border-[#e2d9cb] bg-[#fffdf8] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Drafts
          </p>
          <p className="mt-4 text-5xl font-semibold text-slate-900">{draftPosts}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-[#e7dfd2] bg-[#f8f3ea] text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-6 py-5">Title</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Author</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Actions</th>
              </tr>
            </thead>

            <tbody>
              {(posts || []).map((post) => (
                <tr key={post.id} className="border-b border-[#efe7da] last:border-b-0">
                  <td className="px-6 py-6">
                    <div className="max-w-[420px]">
                      <p className="truncate text-xl font-medium text-slate-900">
                        {post.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">/blog/{post.slug}</p>
                    </div>
                  </td>

                  <td className="px-6 py-6 text-sm text-slate-600">
                    {post.categories?.name || '—'}
                  </td>

                  <td className="px-6 py-6 text-sm text-slate-600">
                    {post.author_name}
                  </td>

                  <td className="px-6 py-6">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        post.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {post.status === 'published' ? 'Live' : 'Draft'}
                    </span>
                  </td>

                  <td className="px-6 py-6 text-sm text-slate-500">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString()
                      : post.created_at
                        ? new Date(post.created_at).toLocaleDateString()
                        : '—'}
                  </td>

                  <td className="px-6 py-6">
                    <PostTableActions
                      postId={post.id}
                      slug={post.slug}
                      status={post.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}