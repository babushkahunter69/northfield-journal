import { notFound } from 'next/navigation';
import { getCategories } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PostEditor } from '@/components/admin/post-editor';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [categories, postResponse] = await Promise.all([
    getCategories(),
    supabaseAdmin.from('posts').select('*').eq('id', id).single()
  ]);

  const post = postResponse.data;

  if (!post) notFound();

  return <PostEditor categories={categories} initialPost={post} />;
}