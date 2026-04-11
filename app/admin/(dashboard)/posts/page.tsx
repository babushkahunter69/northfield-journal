import { supabaseAdmin } from '@/lib/supabase-admin';
import { PostsTable } from '@/components/admin/posts-table';

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

export default async function AdminPostsPage() {
  const postsResponse = await supabaseAdmin
    .from('posts')
    .select(
      'id, title, slug, author_name, status, published_at, updated_at, categories(name)'
    )
    .order('updated_at', { ascending: false });

  const posts = (postsResponse.data ?? []) as PostRow[];

  return <PostsTable posts={posts} />;
}